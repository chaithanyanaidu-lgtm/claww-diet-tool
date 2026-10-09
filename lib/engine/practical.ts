// Practical completeness layer: scoring, hard portion fixes and the rebalance pass that follows
// them. Ported unchanged in behaviour from the legacy engine.

import { FOOD_DB, type FoodKey } from "./foods";
import { descendDay, getPracticalMin, minFatShareFor, round1, type OptItem } from "./optimize";
import { PRACTICAL_RULES } from "./rules";
import type { FoodPortion, Goal, Macros, Meal, MealName, PracticalWarning, Targets } from "./types";

const OTHER_MAIN_PROTEINS: FoodKey[] = ["chicken", "fish", "paneer", "paneer_bhurji", "soya", "eggs"];

interface ScoredMeal {
  name: MealName;
  foods: FoodPortion[];
  totals: Macros;
}

export function scorePracticality(meals: ScoredMeal[], goal: Goal): PracticalWarning[] {
  const warnings: PracticalWarning[] = [];
  const dist = PRACTICAL_RULES.distribution;
  const minFatShareThreshold = minFatShareFor(goal);

  meals.forEach((meal) => {
    const foods = meal.foods;
    const foodMap: Partial<Record<FoodKey, number>> = {};
    foods.forEach((f) => {
      foodMap[f.key] = f.qty;
    });

    const has = (key: FoodKey) => foodMap[key] !== undefined && foodMap[key] > 0;
    const qty = (key: FoodKey) => foodMap[key] || 0;
    const warn = (message: string, rule: PracticalWarning["rule"]) => warnings.push({ mealName: meal.name, message, rule });
    const name = meal.name.toLowerCase();

    if (name === "snack") {
      const r = PRACTICAL_RULES.snack;
      if (has("bread") && has("pb")) {
        const breadG = qty("bread");
        const pbG = qty("pb");
        const minPB = Math.max(r.pbMin, r.pbBreadRatioMin * breadG);
        if (pbG < minPB) {
          warn(`Peanut butter portion is too low (${pbG}g) for bread (${breadG}g). Needs to be at least ${Math.round(minPB)}g.`, "snack_pb_ratio");
        }
      }
      if (qty("bread") > 100) {
        const hasAltFat = qty("almonds") >= 10 || qty("peanuts") >= 10;
        if (qty("pb") < 12 && !hasAltFat) {
          warn(`Snack with >100g bread requires either peanut butter >= 12g or almonds/peanuts >= 10g.`, "snack_high_bread_fat");
        }
      }
      if (has("bread") && has("banana") && qty("banana") > r.bananaMaxWithBread) {
        warn(`Banana portion (${qty("banana")}g) exceeds snack cap with bread. Cap at ${r.bananaMaxWithBread}g.`, "snack_banana_cap");
      }
      let snackFat = 0;
      foods.forEach((f) => {
        snackFat += f.qty * FOOD_DB[f.key].f;
      });
      if (snackFat < r.minFatPerSnack) {
        warn(`Snack fat is too low (${snackFat.toFixed(1)}g). Needs at least ${r.minFatPerSnack}g to prevent a dry meal.`, "snack_min_fat");
      }
    }

    if (name === "breakfast") {
      const r = PRACTICAL_RULES.breakfast;
      if (has("oats") && qty("oats") > r.oatsHighThreshold) {
        const milkOk = has("milk") && qty("milk") >= r.minMilkWithHighOats;
        const eggsOk = has("eggs") && qty("eggs") >= r.minEggsWithHighOats;
        const paneerOk = has("paneer") && qty("paneer") >= r.minPaneerWithHighOats;
        if (!milkOk && !eggsOk && !paneerOk) {
          warn(`Oats > ${r.oatsHighThreshold}g requires companion protein: Milk >= 200ml, Eggs >= 100g, or Paneer >= 60g.`, "breakfast_high_oats_protein");
        }
      }
      if (has("pb") && qty("pb") < r.pbMinIfPresent) {
        warn(`Peanut butter portion is too low (${qty("pb")}g). Enforce min ${r.pbMinIfPresent}g if present.`, "breakfast_pb_min");
      }
    }

    if (name === "lunch" || name === "dinner") {
      const r = PRACTICAL_RULES.lunchDinner;
      if (has("chicken") && qty("chicken") < r.minChicken) {
        warn(`Chicken Breast portion is too low (${qty("chicken")}g). Enforce min ${r.minChicken}g.`, "main_chicken_min");
      }
      if (has("fish") && qty("fish") < r.minFish) {
        warn(`Fish portion is too low (${qty("fish")}g). Enforce min ${r.minFish}g.`, "main_fish_min");
      }
      if (has("paneer") && qty("paneer") < r.minPaneer) {
        warn(`Paneer portion is too low (${qty("paneer")}g). Enforce min ${r.minPaneer}g.`, "main_paneer_min");
      }
      if (has("paneer_bhurji") && qty("paneer_bhurji") < r.minPaneer) {
        warn(`Paneer Bhurji portion is too low (${qty("paneer_bhurji")}g). Enforce min ${r.minPaneer}g.`, "main_paneer_bhurji_min");
      }
      if (has("dal") && qty("dal") < r.minDalMajor) {
        const hasOtherProtein = OTHER_MAIN_PROTEINS.some((k) => has(k));
        if (!hasOtherProtein) {
          warn(`Dal portion is too low (${qty("dal")}g) as major protein source. Enforce min ${r.minDalMajor}g.`, "main_dal_major_min");
        }
      }
      if (has("curd") && qty("curd") < r.minCurdIfIncluded) {
        warn(`Curd portion is too low (${qty("curd")}g). Enforce min ${r.minCurdIfIncluded}g if included.`, "main_curd_min");
      }

      const hasCarb = foods.some((f) => FOOD_DB[f.key].type === "carb");
      const hasProtein = foods.some((f) => FOOD_DB[f.key].type === "protein");
      const hasVeg = foods.some((f) => FOOD_DB[f.key].type === "veg");
      if (!hasCarb || !hasProtein || !hasVeg) {
        warn(`Meal must contain a carb base, a major protein, and a vegetable/fiber component.`, "main_completeness");
      }
    }

    const mealTotals = meal.totals;
    const fatCal = mealTotals.f * 9;
    const fatShare = fatCal / mealTotals.cal;
    if (mealTotals.cal > 0 && fatShare < minFatShareThreshold) {
      warn(
        `Fat calorie share is too low (${(fatShare * 100).toFixed(1)}%). Enforce min ${(minFatShareThreshold * 100).toFixed(0)}% of meal calories for goal '${goal}'.`,
        "dist_fat_share",
      );
    }

    foods.forEach((f) => {
      const itemCal = f.qty * FOOD_DB[f.key].cal;
      const itemShare = itemCal / mealTotals.cal;
      if (mealTotals.cal > 0 && itemShare > dist.maxSingleItemCalorieShare) {
        warn(
          `Single item '${f.name}' dominates meal calories (${(itemShare * 100).toFixed(1)}%). Maximum allowed is ${(dist.maxSingleItemCalorieShare * 100).toFixed(0)}%.`,
          "dist_single_dominance",
        );
      }
    });
  });

  return warnings;
}

/** Recomputes a food's macros from its quantity. */
function refreshFood(food: FoodPortion) {
  const fd = FOOD_DB[food.key];
  food.cal = Math.round(food.qty * fd.cal);
  food.p = round1(food.qty * fd.p);
  food.c = round1(food.qty * fd.c);
  food.f = round1(food.qty * fd.f);
  food.fib = round1(food.qty * fd.fib);
}

/**
 * Enforces hard portion minimums/caps in place and recomputes totals.
 * Returns true if any quantity changed.
 */
export function applyPracticalConstraints(meals: Meal[], targets: Targets): boolean {
  let adjusted = false;
  const targetCalVal = targets.targetCalories;

  meals.forEach((meal) => {
    const foodMap: Partial<Record<FoodKey, FoodPortion>> = {};
    meal.foods.forEach((f) => {
      foodMap[f.key] = f;
    });

    const has = (key: FoodKey) => foodMap[key] !== undefined && foodMap[key].qty > 0;
    const getFood = (key: FoodKey) => foodMap[key]!;
    const name = meal.name.toLowerCase();

    if (name === "snack") {
      const r = PRACTICAL_RULES.snack;
      if (has("bread") && has("pb")) {
        const bread = getFood("bread");
        const pb = getFood("pb");
        const targetPBMin = targetCalVal > 2000 ? r.pbPreferred : r.pbMin;
        const requiredPB = Math.max(targetPBMin, r.pbBreadRatioMin * bread.qty);
        if (pb.qty < requiredPB) {
          pb.qty = Math.round(requiredPB);
          adjusted = true;
        }
      }
      if (has("bread") && getFood("bread").qty > 100) {
        if (has("pb")) {
          const pb = getFood("pb");
          const almondsQty = has("almonds") ? getFood("almonds").qty : 0;
          const peanutsQty = has("peanuts") ? getFood("peanuts").qty : 0;
          if (pb.qty < 12 && almondsQty < 10 && peanutsQty < 10) {
            pb.qty = 12;
            adjusted = true;
          }
        }
      }
      if (has("bread") && has("banana")) {
        const banana = getFood("banana");
        if (banana.qty > r.bananaMaxWithBread) {
          banana.qty = r.bananaMaxWithBread;
          adjusted = true;
        }
      }
      let currentFat = 0;
      meal.foods.forEach((f) => {
        currentFat += f.qty * FOOD_DB[f.key].f;
      });
      if (currentFat < r.minFatPerSnack) {
        if (has("pb")) {
          const pb = getFood("pb");
          const neededPB = Math.ceil(r.minFatPerSnack / 0.5);
          if (pb.qty < neededPB) {
            pb.qty = neededPB;
            adjusted = true;
          }
        } else if (has("almonds")) {
          const almonds = getFood("almonds");
          const neededAlmonds = Math.ceil(r.minFatPerSnack / 0.49);
          if (almonds.qty < neededAlmonds) {
            almonds.qty = neededAlmonds;
            adjusted = true;
          }
        }
      }
    }

    if (name === "breakfast") {
      const r = PRACTICAL_RULES.breakfast;
      if (has("oats") && getFood("oats").qty > r.oatsHighThreshold) {
        if (has("milk") && getFood("milk").qty < r.minMilkWithHighOats) {
          getFood("milk").qty = r.minMilkWithHighOats;
          adjusted = true;
        } else if (has("eggs") && getFood("eggs").qty < r.minEggsWithHighOats) {
          getFood("eggs").qty = r.minEggsWithHighOats;
          adjusted = true;
        } else if (has("paneer") && getFood("paneer").qty < r.minPaneerWithHighOats) {
          getFood("paneer").qty = r.minPaneerWithHighOats;
          adjusted = true;
        }
      }
      if (has("pb") && getFood("pb").qty < r.pbMinIfPresent) {
        getFood("pb").qty = r.pbMinIfPresent;
        adjusted = true;
      }
    }

    if (name === "lunch" || name === "dinner") {
      const r = PRACTICAL_RULES.lunchDinner;
      if (has("chicken") && getFood("chicken").qty < r.minChicken) {
        getFood("chicken").qty = r.minChicken;
        adjusted = true;
      }
      if (has("fish") && getFood("fish").qty < r.minFish) {
        getFood("fish").qty = r.minFish;
        adjusted = true;
      }
      if (has("paneer") && getFood("paneer").qty < r.minPaneer) {
        getFood("paneer").qty = r.minPaneer;
        adjusted = true;
      }
      if (has("paneer_bhurji") && getFood("paneer_bhurji").qty < r.minPaneer) {
        getFood("paneer_bhurji").qty = r.minPaneer;
        adjusted = true;
      }
      if (has("dal") && getFood("dal").qty < r.minDalMajor) {
        const hasOtherProtein = OTHER_MAIN_PROTEINS.some((k) => has(k));
        if (!hasOtherProtein) {
          getFood("dal").qty = r.minDalMajor;
          adjusted = true;
        }
      }
      if (has("curd") && getFood("curd").qty < r.minCurdIfIncluded) {
        getFood("curd").qty = r.minCurdIfIncluded;
        adjusted = true;
      }
    }
  });

  meals.forEach((meal) => {
    let p = 0, c = 0, f = 0, fib = 0;
    meal.foods.forEach((food) => {
      const fd = FOOD_DB[food.key];
      refreshFood(food);
      p += food.qty * fd.p;
      c += food.qty * fd.c;
      f += food.qty * fd.f;
      fib += food.qty * fd.fib;
    });

    meal.totals = {
      cal: Math.round(p * 4 + c * 4 + f * 9),
      p: round1(p),
      c: round1(c),
      f: round1(f),
      fib: round1(fib),
    };
  });

  if (adjusted) {
    meals.forEach((m) => {
      m.adjustedForUsability = true;
    });
  }

  return adjusted;
}

/** Re-optimises the whole day from the adjusted quantities, with practical minimums as bounds. */
export function rebalanceAfterPracticalAdjustments(meals: Meal[], targets: Targets): number {
  const state: OptItem[] = [];
  meals.forEach((meal, mealIndex) => {
    meal.foods.forEach((f) => {
      const fd = FOOD_DB[f.key];
      let newMin: number = fd.min;
      const name = meal.name.toLowerCase();

      if (name === "snack") {
        const r = PRACTICAL_RULES.snack;
        if (f.key === "pb") {
          const breadFood = meal.foods.find((x) => x.key === "bread");
          const breadQty = breadFood ? breadFood.qty : 0;
          const targetPBMin = targets.targetCalories > 2000 ? r.pbPreferred : r.pbMin;
          const pbMinFromBread = Math.max(targetPBMin, r.pbBreadRatioMin * breadQty);
          const neededPBFromFat = Math.ceil(r.minFatPerSnack / 0.5);
          newMin = Math.max(pbMinFromBread, neededPBFromFat);
        }
        if (f.key === "almonds") newMin = Math.ceil(r.minFatPerSnack / 0.49);
        if (f.key === "peanuts") newMin = Math.ceil(r.minFatPerSnack / 0.49);
      } else {
        newMin = getPracticalMin(name, f.key, { [name]: meal.foods.map((x) => x.key) }, targets);
      }

      state.push({ mealIndex, key: f.key, qty: f.qty, min: newMin, max: fd.max, cal: fd.cal, p: fd.p, c: fd.c, f: fd.f, fib: fd.fib });
    });
  });

  const { best, attempts } = descendDay(state, targets);

  best.forEach((s) => {
    const food = meals[s.mealIndex].foods.find((f) => f.key === s.key);
    if (food) {
      food.qty = Math.round(s.qty);
      refreshFood(food);
    }
  });

  meals.forEach((meal) => {
    let cal = 0, p = 0, c = 0, f = 0, fib = 0;
    meal.foods.forEach((food) => {
      cal += food.p * 4 + food.c * 4 + food.f * 9;
      p += food.p;
      c += food.c;
      f += food.f;
      fib += food.fib;
    });
    meal.totals = { cal: Math.round(cal), p: round1(p), c: round1(c), f: round1(f), fib: round1(fib) };
  });

  return attempts;
}
