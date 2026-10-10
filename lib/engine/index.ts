import { buildAlternatives } from "./alternatives";
import { runGlobalOptimization, round1 } from "./optimize";
import { applyPracticalConstraints, rebalanceAfterPracticalAdjustments, scorePracticality } from "./practical";
import { calculateReplacements } from "./replacements";
import { calculateDailyTargets } from "./targets";
import { getOriginalTemplates, makeFoodFilter } from "./templates";
import type { Macros, Meal, PlanDebug, PlanInput, PlanReport } from "./types";

export const ENGINE_VERSION = "1.0.0";

export * from "./types";
export { FOOD_DB, PREFERRED_FOOD_OPTIONS, type FoodKey } from "./foods";
export { PRACTICAL_RULES } from "./rules";
export { calculateDailyTargets } from "./targets";

/** Daily totals: summed meal macros, calories re-derived 4-4-9 for consistency. */
export function sumDay(meals: Meal[]): Macros {
  let p = 0, c = 0, f = 0, fib = 0;
  meals.forEach((m) => {
    p += m.totals.p;
    c += m.totals.c;
    f += m.totals.f;
    fib += m.totals.fib;
  });
  return {
    cal: Math.round(p * 4 + c * 4 + f * 9),
    p: round1(p),
    c: round1(c),
    f: round1(f),
    fib: round1(fib),
  };
}

/**
 * Turns validated inputs into a one-day plan. Pure and deterministic: no globals, no DOM,
 * no logging. Pass `{ debug: true }` to get optimiser details in `report.debug`.
 */
export function generatePlan(input: PlanInput, options: { debug?: boolean } = {}): PlanReport {
  const targets = calculateDailyTargets(input);
  const filter = makeFoodFilter(input);
  const templates = getOriginalTemplates(input, filter);

  const { meals, attempts: globalAttempts } = runGlobalOptimization(templates, targets);

  let rebalanceAttempts = 0;
  const adjusted = applyPracticalConstraints(meals, targets);
  if (adjusted) {
    rebalanceAttempts = rebalanceAfterPracticalAdjustments(meals, targets);
    applyPracticalConstraints(meals, targets); // finalise quantities and totals
  }

  const totals = sumDay(meals);
  const debug: PlanDebug | undefined = options.debug
    ? { globalAttempts, rebalanced: adjusted, rebalanceAttempts, rejectedAlternatives: [] }
    : undefined;
  const alternatives = buildAlternatives(meals, targets, filter, debug?.rejectedAlternatives);
  const replacements = calculateReplacements(meals);
  const warnings = scorePracticality(meals, targets.goal);

  const report: PlanReport = { engineVersion: ENGINE_VERSION, targets, meals, alternatives, replacements, totals, warnings };
  if (debug) report.debug = debug;
  return report;
}
