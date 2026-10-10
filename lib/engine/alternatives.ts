import { MEAL_KEYS, optimizeSingleMeal } from "./optimize";
import { scorePracticality } from "./practical";
import { getAlternativeTemplates, type FoodFilter } from "./templates";
import type { AltMeal, Meal, MealKey, PlanDebug, Targets } from "./types";

const SOFT_RULES = new Set(["dist_fat_share", "dist_single_dominance"]);

/**
 * Up to 3 alternative versions of each meal, each optimised to that meal's totals.
 * Alternatives that break a hard practical rule are dropped (the legacy app showed an
 * "Alternative unavailable" placeholder instead; the UI now just hides them).
 */
export function buildAlternatives(
  meals: Meal[],
  targets: Targets,
  filter: FoodFilter,
  rejected?: PlanDebug["rejectedAlternatives"],
): Record<MealKey, AltMeal[]> {
  const templates = getAlternativeTemplates(filter);
  const alternatives = Object.fromEntries(MEAL_KEYS.map((k) => [k, [] as AltMeal[]])) as Record<MealKey, AltMeal[]>;

  meals.forEach((meal) => {
    templates[meal.key].forEach((foodKeys, index) => {
      const label = `Alternative ${index + 1}`;
      const alt = optimizeSingleMeal(foodKeys, meal.totals, meal.name, targets);
      const warnings = scorePracticality([{ name: meal.name, foods: alt.foods, totals: alt.totals }], targets.goal);
      const hardRules = warnings.filter((w) => !SOFT_RULES.has(w.rule)).map((w) => w.rule);

      const finiteTotals = Object.values(alt.totals).every(Number.isFinite);
      const finiteFoods = alt.foods.every(
        (f) => Number.isFinite(f.qty) && Number.isFinite(f.cal) && Number.isFinite(f.p) && Number.isFinite(f.c) && Number.isFinite(f.f) && Number.isFinite(f.fib),
      );

      if (!alt.invalid && finiteTotals && finiteFoods && hardRules.length === 0) {
        alternatives[meal.key].push({ label, foods: alt.foods, totals: alt.totals });
      } else {
        rejected?.push({ meal: meal.key, label, rules: hardRules, invalid: alt.invalid });
      }
    });
  });

  return alternatives;
}
