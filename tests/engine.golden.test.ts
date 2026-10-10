import { describe, expect, it } from "vitest";
import fixtures from "./fixtures/legacy-outputs.json";
import { generatePlan, sumDay, type PlanInput, type MealKey } from "@/lib/engine";
import { runGlobalOptimization } from "@/lib/engine/optimize";
import { applyPracticalConstraints, rebalanceAfterPracticalAdjustments, scorePracticality } from "@/lib/engine/practical";
import { calculateDailyTargets } from "@/lib/engine/targets";
import type { Templates } from "@/lib/engine/templates";

// Loose shapes of the legacy output (fixtures are plain JSON).
interface LegacyFood { key: string; qty: number; unit: string }
interface LegacyMeal { name: string; foods: LegacyFood[]; totals: Record<string, number> }
interface LegacyTotals { cal: number; p: number; c: number; f: number; fib: number }

const TOL = fixtures.tolerances;
const MEAL_KEYS: MealKey[] = ["breakfast", "lunch", "snack", "dinner"];

function expectTotalsClose(actual: LegacyTotals, legacy: LegacyTotals) {
  expect(Math.abs(actual.cal - legacy.cal)).toBeLessThanOrEqual(TOL.cal);
  expect(Math.abs(actual.p - legacy.p)).toBeLessThanOrEqual(TOL.protein);
  expect(Math.abs(actual.f - legacy.f)).toBeLessThanOrEqual(TOL.fat);
  expect(Math.abs(actual.c - legacy.c)).toBeLessThanOrEqual(TOL.carbs);
  expect(Math.abs(actual.fib - legacy.fib)).toBeLessThanOrEqual(TOL.fiber);
}

function expectMealsMatch(actual: { name: string; foods: LegacyFood[] }[], legacy: LegacyMeal[]) {
  expect(actual.map((m) => m.name)).toEqual(legacy.map((m) => m.name));
  actual.forEach((meal, i) => {
    expect(meal.foods.map((f) => f.key), `${meal.name} foods`).toEqual(legacy[i].foods.map((f) => f.key));
    meal.foods.forEach((f, j) => {
      expect(Math.abs(f.qty - legacy[i].foods[j].qty), `${meal.name} ${f.key} qty`).toBeLessThanOrEqual(1);
    });
  });
}

describe("golden: new engine vs legacy/index.html", () => {
  it("covers the 3 test_math.js profiles plus at least 30 more inputs", () => {
    expect(fixtures.cases.length).toBeGreaterThanOrEqual(33);
  });

  describe.each(fixtures.cases.map((c) => [c.id, c] as const))("%s", (_id, fixture) => {
    const input = fixture.input as PlanInput;
    const legacy = fixture.output;
    const report = generatePlan(input);

    it("same targets exactly", () => {
      const t = report.targets;
      expect({
        goal: t.goal,
        bmr: t.bmr,
        maintenanceCal: t.maintenanceCal,
        targetCalories: t.targetCalories,
        protein: t.protein,
        proteinCalories: t.proteinCalories,
        fat: t.fat,
        fatCalories: t.fatCalories,
        carbs: t.carbs,
        carbsCalories: t.carbsCalories,
        fiber: t.fiber,
      }).toEqual({
        goal: legacy.targets.goal,
        bmr: legacy.targets.bmr,
        maintenanceCal: legacy.targets.maintenanceCal,
        targetCalories: legacy.targets.targetCalories,
        protein: legacy.targets.protein,
        proteinCalories: legacy.targets.proteinCalories,
        fat: legacy.targets.fat,
        fatCalories: legacy.targets.fatCalories,
        carbs: legacy.targets.carbs,
        carbsCalories: legacy.targets.carbsCalories,
        fiber: legacy.targets.fiber,
      });
    });

    it("same foods per meal, quantities within ±1 g", () => {
      expectMealsMatch(report.meals, legacy.meals as LegacyMeal[]);
    });

    it("daily totals within legacy tolerances", () => {
      expectTotalsClose(report.totals, legacy.totals);
    });

    it("same valid alternatives", () => {
      const legacyAlts = legacy.alternatives as Record<string, { label: string; foods: LegacyFood[]; invalid?: boolean }[]>;
      for (const key of MEAL_KEYS) {
        const name = key[0].toUpperCase() + key.slice(1);
        const expected = legacyAlts[name].filter((a) => !a.invalid);
        const actual = report.alternatives[key];
        expect(actual.map((a) => a.label), `${name} alternative labels`).toEqual(expected.map((a) => a.label));
        actual.forEach((alt, i) => {
          expect(alt.foods.map((f) => f.key)).toEqual(expected[i].foods.map((f) => f.key));
          alt.foods.forEach((f, j) => expect(Math.abs(f.qty - expected[i].foods[j].qty)).toBeLessThanOrEqual(1));
        });
      }
    });

    it("same swap table", () => {
      const legacyRepl = legacy.replacements as { origName: string; origQty: string; replName: string; replQty: string }[];
      expect(report.replacements.map((r) => [r.fromName, r.toName])).toEqual(legacyRepl.map((r) => [r.origName, r.replName]));
      report.replacements.forEach((r, i) => {
        expect(Math.abs(r.fromQty - parseFloat(legacyRepl[i].origQty))).toBeLessThanOrEqual(1);
        expect(Math.abs(r.toQty - parseFloat(legacyRepl[i].replQty))).toBeLessThanOrEqual(2);
      });
    });

    it("same practicality warnings", () => {
      const legacyWarnings = legacy.warnings as { mealName: string; rule: string }[];
      expect(report.warnings.map((w) => `${w.mealName}:${w.rule}`)).toEqual(legacyWarnings.map((w) => `${w.mealName}:${w.rule}`));
    });
  });
});

describe("golden: legacy/test_math.js cases (fixed templates)", () => {
  describe.each(fixtures.testMathCases.map((c) => [c.id, c] as const))("%s", (_id, fixture) => {
    const input = fixture.input as PlanInput;
    const targets = calculateDailyTargets(input);
    const { meals } = runGlobalOptimization(fixture.templates as Templates, targets);
    if (applyPracticalConstraints(meals, targets)) {
      rebalanceAfterPracticalAdjustments(meals, targets);
      applyPracticalConstraints(meals, targets);
    }
    const totals = sumDay(meals);

    it("targets match test_math.js", () => {
      const tm = fixture.testMath.targets;
      expect([targets.targetCalories, targets.protein, targets.fat, targets.carbs, targets.fiber]).toEqual([
        tm.targetCalories, tm.protein, tm.fat, tm.carbs, tm.fiber,
      ]);
    });

    it("meals match index.html and test_math.js", () => {
      expectMealsMatch(meals, fixture.indexHtml.meals as LegacyMeal[]);
      expectMealsMatch(meals, fixture.testMath.meals as LegacyMeal[]);
      expectTotalsClose(totals, fixture.indexHtml.totals);
      expectTotalsClose(totals, fixture.testMath.totals);
    });

    it("passes test_math.js's own checks: tolerances, no NaN, no hard practicality violations", () => {
      const t = targets;
      expect(Math.abs(totals.cal - t.targetCalories)).toBeLessThanOrEqual(TOL.cal);
      expect(Math.abs(totals.p - t.protein)).toBeLessThanOrEqual(TOL.protein);
      expect(Math.abs(totals.f - t.fat)).toBeLessThanOrEqual(TOL.fat);
      expect(Math.abs(totals.c - t.carbs)).toBeLessThanOrEqual(TOL.carbs);
      expect(Math.abs(totals.fib - t.fiber)).toBeLessThanOrEqual(TOL.fiber);
      meals.forEach((m) => expect(Number.isNaN(m.totals.f)).toBe(false));
      const hard = scorePracticality(meals, t.goal).filter((w) => w.rule !== "dist_fat_share" && w.rule !== "dist_single_dominance");
      expect(hard).toEqual([]);
    });
  });
});
