// Coordinate-descent optimiser over gram quantities, ported unchanged in behaviour from the
// legacy engine: same loss terms, weights, step sizes, iteration caps and re-weighting.

import { FOOD_DB, type FoodKey } from "./foods";
import { MEAL_CALORIE_SPLIT, PRACTICAL_RULES } from "./rules";
import type { FoodPortion, Macros, Meal, MealKey, MealName, Targets } from "./types";
import type { Templates } from "./templates";

export const MEAL_KEYS: readonly MealKey[] = ["breakfast", "lunch", "snack", "dinner"];
export const MEAL_NAMES: Record<MealKey, MealName> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

/** One food in the optimiser state. */
export interface OptItem {
  mealIndex: number;
  key: FoodKey;
  qty: number;
  min: number;
  max: number;
  cal: number;
  p: number;
  c: number;
  f: number;
  fib: number;
}

interface Weights {
  cal: number;
  p: number;
  c: number;
  f: number;
  fib: number;
}

const OTHER_MAIN_PROTEINS: FoodKey[] = ["chicken", "fish", "paneer", "paneer_bhurji", "soya", "eggs"];

export const round1 = (v: number) => Math.round(v * 10) / 10;

/** Minimum grams for a food in a meal after applying the real-world portion rules. */
export function getPracticalMin(
  mealKey: string,
  foodKey: FoodKey,
  templates: Partial<Record<string, FoodKey[]>>,
  targets: Targets,
): number {
  const fd = FOOD_DB[foodKey];
  let newMin: number = fd.min;
  const targetCalVal = targets.targetCalories;
  const meal = mealKey.toLowerCase();

  if (meal === "snack") {
    const r = PRACTICAL_RULES.snack;
    if (foodKey === "pb") {
      // Legacy assumes 60 g bread here whether or not bread is in the snack.
      const estimatedBread = 60;
      const targetPBMin = targetCalVal > 2000 ? r.pbPreferred : r.pbMin;
      const pbMinFromBread = Math.max(targetPBMin, r.pbBreadRatioMin * estimatedBread);
      const neededPBFromFat = Math.ceil(r.minFatPerSnack / 0.5);
      newMin = Math.max(pbMinFromBread, neededPBFromFat);
    }
    if (foodKey === "almonds") newMin = Math.ceil(r.minFatPerSnack / 0.49);
    if (foodKey === "peanuts") newMin = Math.ceil(r.minFatPerSnack / 0.49);
  }

  if (meal === "breakfast") {
    const r = PRACTICAL_RULES.breakfast;
    // Applies whenever oats are present, not only above the 80 g threshold (legacy index.html behaviour).
    const hasOats = (templates.breakfast ?? []).includes("oats");
    if (hasOats) {
      if (foodKey === "milk") newMin = r.minMilkWithHighOats;
      if (foodKey === "eggs") newMin = r.minEggsWithHighOats;
      if (foodKey === "paneer") newMin = r.minPaneerWithHighOats;
    }
    if (foodKey === "pb") newMin = r.pbMinIfPresent;
  }

  if (meal === "lunch" || meal === "dinner") {
    const r = PRACTICAL_RULES.lunchDinner;
    if (foodKey === "chicken") newMin = r.minChicken;
    if (foodKey === "fish") newMin = r.minFish;
    if (foodKey === "paneer") newMin = r.minPaneer;
    if (foodKey === "paneer_bhurji") newMin = r.minPaneer;
    if (foodKey === "dal") {
      const hasOtherProtein = (templates[meal] ?? []).some((x) => OTHER_MAIN_PROTEINS.includes(x));
      if (!hasOtherProtein) newMin = r.minDalMajor;
    }
    if (foodKey === "curd") newMin = r.minCurdIfIncluded;
  }

  return newMin;
}

export function minFatShareFor(goal: Targets["goal"]): number {
  const dist = PRACTICAL_RULES.distribution;
  const byGoal = dist.minFatCalorieSharePerMealByGoal[goal];
  return byGoal !== undefined ? byGoal : dist.minFatCalorieSharePerMeal;
}

/** Whole-day loss: target errors + meal calorie split + practicality penalties. */
function dayLoss(st: OptItem[], weights: Weights, targets: Targets): number {
  let totalP = 0, totalC = 0, totalF = 0, totalFib = 0;
  const mealCal = [0, 0, 0, 0];
  const mealF = [0, 0, 0, 0];

  st.forEach((s) => {
    totalP += s.qty * s.p;
    totalC += s.qty * s.c;
    totalF += s.qty * s.f;
    totalFib += s.qty * s.fib;
    mealCal[s.mealIndex] += s.qty * s.cal;
    mealF[s.mealIndex] += s.qty * s.f;
  });

  const totalCal = totalP * 4 + totalC * 4 + totalF * 9;

  const dCal = totalCal - targets.targetCalories;
  const dP = totalP - targets.protein;
  const dC = totalC - targets.carbs;
  const dF = totalF - targets.fat;
  const dFib = totalFib - targets.fiber;

  const targetLoss =
    dCal * dCal * weights.cal +
    dP * dP * weights.p +
    dC * dC * weights.c +
    dF * dF * weights.f +
    dFib * dFib * weights.fib;

  let ratioLoss = 0;
  for (let i = 0; i < 4; i++) {
    const targetMealCal = targets.targetCalories * MEAL_CALORIE_SPLIT[i];
    const dMealCal = mealCal[i] - targetMealCal;
    ratioLoss += dMealCal * dMealCal * 0.25;
  }

  let penaltyLoss = 0;
  const dist = PRACTICAL_RULES.distribution;
  const minFatShareThreshold = minFatShareFor(targets.goal);

  for (let i = 0; i < 4; i++) {
    const mealFoods = st.filter((s) => s.mealIndex === i);
    const qtyMap: Partial<Record<FoodKey, number>> = {};
    mealFoods.forEach((s) => {
      qtyMap[s.key] = s.qty;
    });

    const has = (key: FoodKey) => qtyMap[key] !== undefined && qtyMap[key] > 0;
    const getQty = (key: FoodKey) => qtyMap[key] || 0;

    const mCal = mealCal[i];
    const mF = mealF[i];

    // Fat concentration
    const fatCal = mF * 9;
    if (mCal > 0) {
      const fatShare = fatCal / mCal;
      if (fatShare < minFatShareThreshold) {
        const diff = minFatShareThreshold * mCal - fatCal;
        penaltyLoss += diff * diff * 2.0;
      }
    }

    // Single item dominance
    mealFoods.forEach((s) => {
      const itemCal = s.qty * s.cal;
      if (mCal > 0) {
        const share = itemCal / mCal;
        if (share > dist.maxSingleItemCalorieShare) {
          const diff = itemCal - dist.maxSingleItemCalorieShare * mCal;
          penaltyLoss += diff * diff * 2.0;
        }
      }
    });

    // Breakfast companion protein & peanut butter
    if (i === 0) {
      const r = PRACTICAL_RULES.breakfast;
      if (has("oats") && getQty("oats") > r.oatsHighThreshold) {
        let companionDiff = 0;
        if (has("milk")) companionDiff = Math.max(0, r.minMilkWithHighOats - getQty("milk"));
        else if (has("eggs")) companionDiff = Math.max(0, r.minEggsWithHighOats - getQty("eggs"));
        else if (has("paneer")) companionDiff = Math.max(0, r.minPaneerWithHighOats - getQty("paneer"));
        if (companionDiff > 0) {
          penaltyLoss += companionDiff * companionDiff * 15.0;
        }
      }
      if (has("pb") && getQty("pb") < r.pbMinIfPresent) {
        const diff = r.pbMinIfPresent - getQty("pb");
        penaltyLoss += diff * diff * 25.0;
      }
    }

    // Lunch & dinner protein minimums & curd
    if (i === 1 || i === 3) {
      const r = PRACTICAL_RULES.lunchDinner;
      if (has("chicken") && getQty("chicken") < r.minChicken) {
        const diff = r.minChicken - getQty("chicken");
        penaltyLoss += diff * diff * 25.0;
      }
      if (has("fish") && getQty("fish") < r.minFish) {
        const diff = r.minFish - getQty("fish");
        penaltyLoss += diff * diff * 25.0;
      }
      if (has("paneer") && getQty("paneer") < r.minPaneer) {
        const diff = r.minPaneer - getQty("paneer");
        penaltyLoss += diff * diff * 25.0;
      }
      if (has("paneer_bhurji") && getQty("paneer_bhurji") < r.minPaneer) {
        const diff = r.minPaneer - getQty("paneer_bhurji");
        penaltyLoss += diff * diff * 25.0;
      }
      if (has("dal") && getQty("dal") < r.minDalMajor) {
        const hasOtherProtein = OTHER_MAIN_PROTEINS.some((k) => has(k));
        if (!hasOtherProtein) {
          const diff = r.minDalMajor - getQty("dal");
          penaltyLoss += diff * diff * 25.0;
        }
      }
      if (has("curd") && getQty("curd") < r.minCurdIfIncluded) {
        const diff = r.minCurdIfIncluded - getQty("curd");
        penaltyLoss += diff * diff * 25.0;
      }
    }

    // Snack peanut butter, banana cap & minimum fat
    if (i === 2) {
      const r = PRACTICAL_RULES.snack;
      if (has("bread") && has("pb")) {
        const breadG = getQty("bread");
        const pbG = getQty("pb");
        const targetPBMin = targets.targetCalories > 2000 ? r.pbPreferred : r.pbMin;
        const minPB = Math.max(targetPBMin, r.pbBreadRatioMin * breadG);
        if (pbG < minPB) {
          const diff = minPB - pbG;
          penaltyLoss += diff * diff * 25.0;
        }
      }
      if (getQty("bread") > 100) {
        if (has("pb")) {
          const pbG = getQty("pb");
          if (pbG < 12 && getQty("almonds") < 10 && getQty("peanuts") < 10) {
            const diff = 12 - pbG;
            penaltyLoss += diff * diff * 25.0;
          }
        }
      }
      if (has("bread") && has("banana") && getQty("banana") > r.bananaMaxWithBread) {
        const diff = getQty("banana") - r.bananaMaxWithBread;
        penaltyLoss += diff * diff * 25.0;
      }
      let currentFat = 0;
      mealFoods.forEach((s) => {
        currentFat += s.qty * s.f;
      });
      if (currentFat < r.minFatPerSnack) {
        const diff = r.minFatPerSnack - currentFat;
        penaltyLoss += diff * diff * 250.0;
      }
    }
  }

  return targetLoss + ratioLoss + penaltyLoss;
}

const copyState = (st: OptItem[]) => st.map((s) => ({ ...s }));

/**
 * Coordinate descent with pairwise calorie-scaled swaps, re-weighting missed targets ×8 for up to
 * 8 attempts. Mutates nothing it was given. Returns the best state and the number of re-weightings.
 */
export function descendDay(initial: OptItem[], targets: Targets): { best: OptItem[]; attempts: number } {
  let state = copyState(initial);
  const weights: Weights = { cal: 1, p: 25, c: 25, f: 100, fib: 25 };
  let bestState = copyState(state);
  let attempts = 0;
  let targetsSatisfied = false;

  while (!targetsSatisfied && attempts < 8) {
    let currentBestLoss = dayLoss(bestState, weights, targets);
    const steps = [15, 8, 4, 2, 1, 0.5, 0.1];

    for (const step of steps) {
      let improved = true;
      let iter = 0;
      while (improved && iter < 120) {
        improved = false;
        iter++;
        for (let i = 0; i < state.length; i++) {
          const originalQty = state[i].qty;

          state[i].qty = Math.min(state[i].max, originalQty + step);
          const lossUp = dayLoss(state, weights, targets);
          if (lossUp < currentBestLoss) {
            currentBestLoss = lossUp;
            bestState = copyState(state);
            improved = true;
            continue;
          }

          state[i].qty = Math.max(state[i].min, originalQty - step);
          const lossDown = dayLoss(state, weights, targets);
          if (lossDown < currentBestLoss) {
            currentBestLoss = lossDown;
            bestState = copyState(state);
            improved = true;
            continue;
          }

          state[i].qty = originalQty;
        }

        // Deterministic pairwise mutations to escape saddle points (calorie-neutral scaled swaps)
        for (let idx1 = 0; idx1 < state.length; idx1++) {
          for (let idx2 = 0; idx2 < state.length; idx2++) {
            if (idx1 === idx2) continue;

            const s1 = state[idx1];
            const s2 = state[idx2];
            const q1Orig = s1.qty;
            const q2Orig = s2.qty;

            const step2 = step * (s1.cal / s2.cal);

            s1.qty = Math.min(s1.max, q1Orig + step);
            s2.qty = Math.max(s2.min, q2Orig - step2);
            let lossMut = dayLoss(state, weights, targets);
            if (lossMut < currentBestLoss) {
              currentBestLoss = lossMut;
              bestState = copyState(state);
              improved = true;
              continue;
            }

            s1.qty = Math.max(s1.min, q1Orig - step);
            s2.qty = Math.min(s2.max, q2Orig + step2);
            lossMut = dayLoss(state, weights, targets);
            if (lossMut < currentBestLoss) {
              currentBestLoss = lossMut;
              bestState = copyState(state);
              improved = true;
              continue;
            }

            s1.qty = q1Orig;
            s2.qty = q2Orig;
          }
        }
      }
    }

    let totalP = 0, totalC = 0, totalF = 0, totalFib = 0;
    bestState.forEach((s) => {
      totalP += s.qty * s.p;
      totalC += s.qty * s.c;
      totalF += s.qty * s.f;
      totalFib += s.qty * s.fib;
    });
    const totalCal = totalP * 4 + totalC * 4 + totalF * 9;

    const errCal = Math.abs(totalCal - targets.targetCalories);
    const errP = Math.abs(totalP - targets.protein);
    const errC = Math.abs(totalC - targets.carbs);
    const errF = Math.abs(totalF - targets.fat);
    const errFib = Math.abs(totalFib - targets.fiber);

    const t = PRACTICAL_RULES.tolerances;
    if (errCal <= t.cal && errP <= t.protein && errF <= t.fat && errC <= t.carbs && errFib <= t.fiber) {
      targetsSatisfied = true;
    } else {
      if (errCal > t.cal) weights.cal *= 8;
      if (errP > t.protein) weights.p *= 8;
      if (errC > t.carbs) weights.c *= 8;
      if (errF > t.fat) weights.f *= 8;
      if (errFib > t.fiber) weights.fib *= 8;

      state = copyState(bestState);
      attempts++;
    }
  }

  return { best: bestState, attempts };
}

/** Per-food macros for a rounded quantity, rounded as the legacy engine does. */
export function portion(key: FoodKey, qty: number): FoodPortion {
  const fd = FOOD_DB[key];
  return {
    key,
    name: fd.name,
    qty,
    unit: fd.unit,
    cal: Math.round(qty * fd.cal),
    p: round1(qty * fd.p),
    c: round1(qty * fd.c),
    f: round1(qty * fd.f),
    fib: round1(qty * fd.fib),
  };
}

export function runGlobalOptimization(templates: Templates, targets: Targets): { meals: Meal[]; attempts: number } {
  const state: OptItem[] = [];

  MEAL_KEYS.forEach((mealKey, mealIndex) => {
    templates[mealKey].forEach((foodKey) => {
      const fd = FOOD_DB[foodKey];
      const pMin = getPracticalMin(mealKey, foodKey, templates, targets);
      state.push({
        mealIndex,
        key: foodKey,
        qty: (pMin + fd.max) / 2,
        min: pMin,
        max: fd.max,
        cal: fd.cal,
        p: fd.p,
        c: fd.c,
        f: fd.f,
        fib: fd.fib,
      });
    });
  });

  const { best, attempts } = descendDay(state, targets);

  const meals: Meal[] = MEAL_KEYS.map((key) => ({
    key,
    name: MEAL_NAMES[key],
    foods: [],
    totals: { cal: 0, p: 0, c: 0, f: 0, fib: 0 },
  }));

  best.forEach((s) => {
    meals[s.mealIndex].foods.push(portion(s.key, Math.round(s.qty)));
  });

  meals.forEach((meal) => {
    let cal = 0, p = 0, c = 0, f = 0, fib = 0;
    meal.foods.forEach((fd) => {
      cal += fd.cal;
      p += fd.p;
      c += fd.c;
      f += fd.f;
      fib += fd.fib;
    });
    meal.totals = { cal: Math.round(cal), p: round1(p), c: round1(c), f: round1(f), fib: round1(fib) };
  });

  return { meals, attempts };
}

export type SingleMealResult =
  | { invalid: true; foods: FoodPortion[]; totals: Macros; reason: string }
  | { invalid: false; foods: FoodPortion[]; totals: Macros };

/** Optimises one meal's quantities toward that meal's macro totals (used for alternatives). */
export function optimizeSingleMeal(
  foodKeys: FoodKey[],
  mealTargets: Macros,
  mealName: string,
  targets: Targets,
): SingleMealResult {
  const validKeys = foodKeys.filter((key) => {
    const fd = FOOD_DB[key];
    return (
      fd &&
      Number.isFinite(fd.cal) &&
      Number.isFinite(fd.p) &&
      Number.isFinite(fd.c) &&
      Number.isFinite(fd.f) &&
      Number.isFinite(fd.fib) &&
      Number.isFinite(fd.min) &&
      Number.isFinite(fd.max)
    );
  });

  if (validKeys.length === 0) {
    return {
      invalid: true,
      foods: [],
      totals: { cal: 0, p: 0, c: 0, f: 0, fib: 0 },
      reason: "Alternative unavailable for current restrictions.",
    };
  }

  const nameLower = mealName.toLowerCase();
  const state = validKeys.map((key) => {
    const fd = FOOD_DB[key];
    const newMin = getPracticalMin(nameLower, key, { [nameLower]: validKeys }, targets);
    let initialQty = (newMin + fd.max) / 2;
    if (!Number.isFinite(initialQty)) initialQty = fd.min;
    return { key, qty: initialQty, min: newMin, max: fd.max as number, cal: fd.cal as number, p: fd.p as number, c: fd.c as number, f: fd.f as number, fib: fd.fib as number };
  });

  const getLoss = (st: typeof state) => {
    let p = 0, c = 0, f = 0, fib = 0;
    st.forEach((s) => {
      p += s.qty * s.p;
      c += s.qty * s.c;
      f += s.qty * s.f;
      fib += s.qty * s.fib;
    });
    const cal = p * 4 + c * 4 + f * 9;

    const dCal = cal - mealTargets.cal;
    const dP = p - mealTargets.p;
    const dC = c - mealTargets.c;
    const dF = f - mealTargets.f;
    const dFib = fib - mealTargets.fib;

    return dCal * dCal + dP * dP * 25 + dC * dC * 25 + dF * dF * 100 + dFib * dFib * 25;
  };

  let bestState = state.map((s) => ({ ...s }));
  let bestLoss = getLoss(bestState);
  const steps = [10, 5, 2, 1, 0.5, 0.1];

  for (const step of steps) {
    let improved = true;
    let iter = 0;
    while (improved && iter < 100) {
      improved = false;
      iter++;
      for (let i = 0; i < state.length; i++) {
        const originalQty = state[i].qty;

        state[i].qty = Math.min(state[i].max, originalQty + step);
        const lossUp = getLoss(state);
        if (lossUp < bestLoss) {
          bestLoss = lossUp;
          bestState = state.map((s) => ({ ...s }));
          improved = true;
          continue;
        }

        state[i].qty = Math.max(state[i].min, originalQty - step);
        const lossDown = getLoss(state);
        if (lossDown < bestLoss) {
          bestLoss = lossDown;
          bestState = state.map((s) => ({ ...s }));
          improved = true;
          continue;
        }

        state[i].qty = originalQty;
      }
    }
  }

  const foods: FoodPortion[] = [];
  let totalCal = 0, totalP = 0, totalC = 0, totalF = 0, totalFib = 0;

  bestState.forEach((s) => {
    let roundedQty = Math.round(s.qty);
    if (!Number.isFinite(roundedQty)) roundedQty = 0;
    const item = portion(s.key, roundedQty);
    if (!Number.isFinite(item.cal)) item.cal = 0;
    if (!Number.isFinite(item.p)) item.p = 0;
    if (!Number.isFinite(item.c)) item.c = 0;
    if (!Number.isFinite(item.f)) item.f = 0;
    if (!Number.isFinite(item.fib)) item.fib = 0;

    // Legacy sums the rounded per-food values without rounding the totals again.
    totalCal += item.cal;
    totalP += item.p;
    totalC += item.c;
    totalF += item.f;
    totalFib += item.fib;
    foods.push(item);
  });

  return {
    invalid: false,
    foods,
    totals: {
      cal: Number.isFinite(totalCal) ? totalCal : 0,
      p: Number.isFinite(totalP) ? totalP : 0,
      c: Number.isFinite(totalC) ? totalC : 0,
      f: Number.isFinite(totalF) ? totalF : 0,
      fib: Number.isFinite(totalFib) ? totalFib : 0,
    },
  };
}
