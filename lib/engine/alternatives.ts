import { FOOD_DB, type FoodKey } from "./foods";
import { MEAL_KEYS, optimizeSingleMeal } from "./optimize";
import { scorePracticality } from "./practical";
import { getAlternativeTemplates, type FoodFilter } from "./templates";
import type { AltMeal, Meal, MealKey, PlanDebug, PracticalRule, Targets } from "./types";

const SOFT_RULES = new Set(["dist_fat_share", "dist_single_dominance"]);

/**
 * Up to 3 alternative versions of each meal, each optimised to that meal's totals.
 * Enforces:
 * - Protein within ±3 g of the main meal
 * - Calories within ±5% of the main meal
 * - Fiber within ±4 g of the main meal
 * - Curd capped at 150 g
 * - Chapati capped at max(120 g, main plate chapati)
 * - Hard practical rules satisfied
 * Non-compliant candidates are rejected and the next candidate is evaluated.
 * If fewer than 3 pass, fewer are shown rather than bad ones.
 */
export function buildAlternatives(
  meals: Meal[],
  targets: Targets,
  filter: FoodFilter,
  rejected?: PlanDebug["rejectedAlternatives"],
): Record<MealKey, AltMeal[]> {
  const mainCarbs: Partial<Record<MealKey, FoodKey>> = {};
  const chapatiCaps: Partial<Record<MealKey, number>> = {};

  meals.forEach((meal) => {
    const carbPortion = meal.foods.find((f) => FOOD_DB[f.key]?.type === "carb");
    if (carbPortion) mainCarbs[meal.key] = carbPortion.key;
    const chapatiPortion = meal.foods.find((f) => f.key === "chapati");
    chapatiCaps[meal.key] = Math.max(120, chapatiPortion?.qty ?? 0);
  });

  const templates = getAlternativeTemplates(filter, mainCarbs);
  const alternatives = Object.fromEntries(MEAL_KEYS.map((k) => [k, [] as AltMeal[]])) as Record<MealKey, AltMeal[]>;

  meals.forEach((meal) => {
    const candidates = templates[meal.key];
    const chapatiMax = chapatiCaps[meal.key] ?? 120;
    const curdMax = 150;

    for (let index = 0; index < candidates.length; index++) {
      if (alternatives[meal.key].length >= 3) break;

      const foodKeys = candidates[index];
      // Don't propose an identical food set as an alternative to itself
      const isIdentical =
        foodKeys.length === meal.foods.length && foodKeys.every((k) => meal.foods.some((f) => f.key === k));
      if (isIdentical) continue;

      const candLabel = `Candidate ${index + 1}`;
      const alt = optimizeSingleMeal(foodKeys, meal.totals, meal.name, targets, { curdMax, chapatiMax });

      const finiteTotals = Object.values(alt.totals).every(Number.isFinite);
      const finiteFoods = alt.foods.every(
        (f) =>
          Number.isFinite(f.qty) &&
          Number.isFinite(f.cal) &&
          Number.isFinite(f.p) &&
          Number.isFinite(f.c) &&
          Number.isFinite(f.f) &&
          Number.isFinite(f.fib),
      );

      if (alt.invalid || !finiteTotals || !finiteFoods) {
        rejected?.push({ meal: meal.key, label: candLabel, rules: [], invalid: true });
        continue;
      }

      // Check practical rules
      const warnings = scorePracticality([{ name: meal.name, foods: alt.foods, totals: alt.totals }], targets.goal);
      const hardRules = warnings.filter((w) => !SOFT_RULES.has(w.rule)).map((w) => w.rule);
      if (hardRules.length > 0) {
        rejected?.push({ meal: meal.key, label: candLabel, rules: hardRules, invalid: false });
        continue;
      }

      // Check macro constraints: protein ±3 g, calories ±5%, fiber ±4 g
      const pDiff = Math.abs(alt.totals.p - meal.totals.p);
      const calDiff = Math.abs(alt.totals.cal - meal.totals.cal);
      const fibDiff = Math.abs(alt.totals.fib - meal.totals.fib);
      const maxCalDelta = meal.totals.cal * 0.05;

      const missRules: PracticalRule[] = [];
      if (pDiff > 3.0) missRules.push("target_miss_protein");
      if (calDiff > maxCalDelta) missRules.push("target_miss_cal");
      if (fibDiff > 4.0) missRules.push("target_miss_fiber");

      // Check portions
      const curdQty = alt.foods.find((f) => f.key === "curd")?.qty ?? 0;
      const chapatiQty = alt.foods.find((f) => f.key === "chapati")?.qty ?? 0;
      if (curdQty > curdMax || chapatiQty > chapatiMax) {
        missRules.push("main_curd_min");
      }

      if (missRules.length > 0) {
        rejected?.push({ meal: meal.key, label: candLabel, rules: missRules, invalid: false });
        continue;
      }

      const label = `Alternative ${alternatives[meal.key].length + 1}`;
      alternatives[meal.key].push({ label, foods: alt.foods, totals: alt.totals });
    }
  });

  return alternatives;
}
