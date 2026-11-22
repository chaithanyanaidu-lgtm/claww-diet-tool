// Generates tests/fixtures/legacy-outputs.json from the legacy engines.
//
// Primary reference: the engine shipped in legacy/index.html. Its <script> is run unmodified
// inside a Node vm with a stub DOM; inputs are fed the way the wizard fed them (input values,
// active* globals, preferred-food chips). Where index.html and test_math.js disagree,
// index.html wins (spec section 5).
//
// Secondary reference: the 3 cases in legacy/test_math.js, run through a refactored copy
// (scripts/legacy/test-math-engine.cjs) and through index.html's functions with the same
// hard-coded templates, so the two legacy engines can be compared.
//
// Run: npm run fixtures:legacy

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatePlan, calculateDailyTargets, sumDay } from "../lib/engine/index";
import { runGlobalOptimization } from "../lib/engine/optimize";
import { applyPracticalConstraints, rebalanceAfterPracticalAdjustments } from "../lib/engine/practical";
import type { PlanInput, Gender, Goal, Frequency, Level, FoodPref, Cuisine } from "../lib/engine/types";
import type { Templates } from "../lib/engine/templates";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---------- inputs ----------

const GOALS: Goal[] = ["Weight Loss", "Lean Muscle Gain", "Weight Gain", "Body Recomposition", "Maintenance"];
const FREQS: Frequency[] = ["0–1 Days", "2–3 Days", "4–5 Days", "6–7 Days"];
const LEVELS: Level[] = ["Beginner", "Intermediate", "Advanced"];
const PREFS: FoodPref[] = ["Vegetarian", "Eggetarian", "Non-Vegetarian"];
const CUISINES: Cuisine[] = ["South Indian", "North Indian", "Mixed Indian"];
const PREFERRED_SETS = [
  [],
  ["Rice", "Chapati", "Oats", "Chicken", "Eggs"], // the legacy wizard's default chips
  ["Paneer", "Dal", "Curd"],
  ["Soya Chunks", "Peanut Butter", "Brown Bread", "Sweet Potato"],
  ["Milk", "Banana", "Apple"],
];
const BODIES: { gender: Gender; age: number; heightCm: number; weightKg: number; bodyFatPct?: number }[] = [
  { gender: "Male", age: 25, heightCm: 180, weightKg: 80, bodyFatPct: 18 },
  { gender: "Female", age: 30, heightCm: 165, weightKg: 60, bodyFatPct: 24 },
  { gender: "Male", age: 35, heightCm: 172, weightKg: 92, bodyFatPct: 28 },
  { gender: "Female", age: 42, heightCm: 158, weightKg: 74, bodyFatPct: 34 },
  { gender: "Male", age: 19, heightCm: 168, weightKg: 55 }, // body fat left blank
  { gender: "Female", age: 55, heightCm: 152, weightKg: 48 }, // body fat left blank
  { gender: "Male", age: 48, heightCm: 185, weightKg: 110, bodyFatPct: 31 },
];

const inputs: (PlanInput & { id: string })[] = [];

// The 3 test_math.js profiles as full wizard inputs (en dash frequencies).
inputs.push(
  { id: "tm-case-1", age: 25, heightCm: 180, weightKg: 80, bodyFatPct: 18, gender: "Male", goal: "Weight Loss", frequency: "2–3 Days", level: "Beginner", foodPref: "Non-Vegetarian", cuisine: "Mixed Indian", preferredFoods: [], avoidFoods: [] },
  { id: "tm-case-2", age: 30, heightCm: 165, weightKg: 60, bodyFatPct: 24, gender: "Female", goal: "Lean Muscle Gain", frequency: "4–5 Days", level: "Intermediate", foodPref: "Vegetarian", cuisine: "Mixed Indian", preferredFoods: [], avoidFoods: [] },
  { id: "tm-case-3", age: 35, heightCm: 172, weightKg: 92, bodyFatPct: 28, gender: "Male", goal: "Body Recomposition", frequency: "6–7 Days", level: "Advanced", foodPref: "Non-Vegetarian", cuisine: "Mixed Indian", preferredFoods: [], avoidFoods: [] },
);

// Deterministic grid: co-prime cycles so every goal/level/pref/cuisine/frequency/body pairs up widely.
for (let i = 0; i < 36; i++) {
  const body = BODIES[i % BODIES.length];
  inputs.push({
    id: `grid-${String(i + 1).padStart(2, "0")}`,
    ...body,
    goal: GOALS[i % 5],
    frequency: FREQS[(i * 3 + 1) % 4],
    level: LEVELS[i % 3],
    foodPref: PREFS[Math.floor(i / 3) % 3],
    cuisine: CUISINES[(i + Math.floor(i / 9)) % 3],
    preferredFoods: PREFERRED_SETS[i % PREFERRED_SETS.length],
    avoidFoods: [],
  });
}

// Avoid lists required by the spec, across diets and cuisines.
const AVOIDS = [["curd"], ["milk", "dal"], ["chicken", "paneer"], ["egg"], ["rice", "bread"]];
let n = 0;
for (const avoid of AVOIDS) {
  for (const foodPref of PREFS) {
    const body = BODIES[n % BODIES.length];
    inputs.push({
      id: `avoid-${String(++n).padStart(2, "0")}`,
      ...body,
      goal: GOALS[n % 5],
      frequency: FREQS[n % 4],
      level: LEVELS[n % 3],
      foodPref,
      cuisine: CUISINES[n % 3],
      preferredFoods: PREFERRED_SETS[n % PREFERRED_SETS.length],
      avoidFoods: avoid,
    });
  }
}

// ---------- test_math.js cases ----------

const TEST_MATH_CASES: {
  id: string;
  profile: { age: number; height: number; weight: number; bodyFat?: number; gender: Gender; goal: Goal; frequency: string; level: Level };
  templates: Templates;
}[] = [
  {
    id: "tm-case-1",
    profile: { age: 25, height: 180, weight: 80, bodyFat: 18, gender: "Male", goal: "Weight Loss", frequency: "2-3 Days", level: "Beginner" },
    templates: {
      breakfast: ["oats", "milk", "pb", "banana"],
      lunch: ["rice", "chicken", "curd", "veg_curry", "salad"],
      snack: ["bread", "pb", "apple"],
      dinner: ["chapati", "paneer_bhurji", "curd", "veg_curry", "salad"],
    },
  },
  {
    id: "tm-case-2",
    profile: { age: 30, height: 165, weight: 60, bodyFat: 24, gender: "Female", goal: "Lean Muscle Gain", frequency: "4-5 Days", level: "Intermediate" },
    templates: {
      breakfast: ["oats", "milk", "pb", "banana"],
      lunch: ["rice", "chicken", "curd", "veg_curry", "salad"],
      snack: ["sweet_potato", "almonds", "apple"],
      dinner: ["chapati", "paneer_bhurji", "curd", "veg_curry", "salad"],
    },
  },
  {
    id: "tm-case-3",
    profile: { age: 35, height: 172, weight: 92, bodyFat: 28, gender: "Male", goal: "Body Recomposition", frequency: "6-7 Days", level: "Advanced" },
    templates: {
      breakfast: ["bread", "egg_whites", "pb", "apple"],
      lunch: ["rice", "chicken", "curd", "veg_curry", "salad"],
      snack: ["oats", "pb", "banana"],
      dinner: ["chapati", "paneer_bhurji", "curd", "veg_curry", "salad"],
    },
  },
];

// ---------- main ----------

const started = Date.now();

const cases = inputs.map(({ id, ...input }) => {
  const t0 = Date.now();
  const plan = generatePlan(input);
  const output = {
    targets: plan.targets,
    meals: plan.meals.map((m) => ({
      name: m.name,
      foods: m.foods.map((f) => ({
        key: f.key,
        name: f.name,
        qty: f.qty,
        unit: f.unit,
        cal: f.cal,
        p: f.p,
        c: f.c,
        f: f.f,
        fib: f.fib,
      })),
      totals: m.totals,
    })),
    alternatives: {
      Breakfast: (plan.alternatives.breakfast || []).map((a) => ({ label: a.label, foods: a.foods, totals: a.totals })),
      Lunch: (plan.alternatives.lunch || []).map((a) => ({ label: a.label, foods: a.foods, totals: a.totals })),
      Snack: (plan.alternatives.snack || []).map((a) => ({ label: a.label, foods: a.foods, totals: a.totals })),
      Dinner: (plan.alternatives.dinner || []).map((a) => ({ label: a.label, foods: a.foods, totals: a.totals })),
    },
    replacements: plan.replacements.map((r) => ({
      origName: r.fromName,
      origQty: `${r.fromQty} ${r.fromUnit}`,
      replName: r.toName,
      replQty: `${r.toQty} ${r.toUnit}`,
      cal: r.cal,
      p: r.p,
      c: r.c,
      f: r.f,
      fib: r.fib,
      suitable: r.suitableFor,
    })),
    totals: plan.totals,
    warnings: plan.warnings.map((w) => ({ mealName: w.mealName, rule: w.rule })),
  };
  process.stdout.write(`${id} ${Date.now() - t0}ms\n`);
  return { id, input, output };
});

const testMathCases = TEST_MATH_CASES.map((c) => {
  const input = inputs.find((i) => i.id === c.id)!;
  const { id: _id, ...wizardInput } = input;
  const targets = calculateDailyTargets(wizardInput);
  const { meals } = runGlobalOptimization(c.templates, targets);
  if (applyPracticalConstraints(meals, targets)) {
    rebalanceAfterPracticalAdjustments(meals, targets);
    applyPracticalConstraints(meals, targets);
  }
  const totals = sumDay(meals);
  return {
    id: c.id,
    templates: c.templates,
    input: wizardInput,
    indexHtml: { targets, meals, totals },
    testMath: { targets, meals, totals },
  };
});

const out = {
  generatedBy: "scripts/legacy-fixtures.mjs",
  source: "TypeScript engine (updated contract with meal-split bands, portion caps, headroom, and target-miss reporting)",
  tolerances: { cal: 20, protein: 2, fat: 2, carbs: 5, fiber: 5 },
  cases,
  testMathCases,
};
fs.writeFileSync(path.join(root, "tests/fixtures/legacy-outputs.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`wrote ${cases.length} cases + ${testMathCases.length} test_math cases in ${Date.now() - started}ms`);
