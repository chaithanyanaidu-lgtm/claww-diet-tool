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
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

// ---------- index.html engine in a sandbox ----------

function loadIndexHtmlEngine() {
  const html = fs.readFileSync(path.join(root, "legacy/index.html"), "utf8");
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if (scripts.length !== 1) throw new Error(`expected 1 inline script, found ${scripts.length}`);

  const inputs = {};
  const el = (id) =>
    (inputs[id] ??= { value: "", style: {}, textContent: "", innerHTML: "", classList: { add() {}, remove() {} } });
  const document = {
    getElementById: el,
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener() {},
  };
  const context = vm.createContext({ document, window: {}, console: { log() {}, warn() {}, error() {} }, Math, Number, Object, Array, JSON });
  vm.runInContext(scripts[0], context, { filename: "legacy/index.html" });
  // Rendering is not part of the engine.
  vm.runInContext("renderResults = function () {};", context);

  return {
    /** Runs generateDietReport() exactly as the wizard would for this input. */
    generate(input) {
      el("inputAge").value = String(input.age);
      el("inputHeight").value = String(input.heightCm);
      el("inputWeight").value = String(input.weightKg);
      el("inputBodyFat").value = input.bodyFatPct === undefined ? "" : String(input.bodyFatPct);
      el("inputAvoidFoods").value = input.avoidFoods.join(", ");
      context.__input = input;
      vm.runInContext(
        `activeGender = __input.gender;
         activeGoal = __input.goal;
         activeFreq = __input.frequency;
         activeLevel = __input.level;
         activeFoodPref = __input.foodPref;
         activeCuisine = __input.cuisine;
         getSelectedPreferredFoods = function () { return __input.preferredFoods.slice(); };
         latestReport = null;
         generateDietReport();`,
        context,
      );
      const report = vm.runInContext("latestReport", context);
      const warnings = vm.runInContext("scorePracticality(latestReport.meals, latestReport.targets.goal)", context);
      return clone({ ...report, warnings });
    },

    /** Runs index.html's optimizer pipeline on fixed templates (for the test_math.js cases). */
    optimizeTemplates(input, templates) {
      el("inputAge").value = String(input.age);
      el("inputHeight").value = String(input.heightCm);
      el("inputWeight").value = String(input.weightKg);
      el("inputBodyFat").value = input.bodyFatPct === undefined ? "" : String(input.bodyFatPct);
      context.__input = input;
      context.__templates = templates;
      vm.runInContext(
        `activeGender = __input.gender;
         activeGoal = __input.goal;
         activeFreq = __input.frequency;
         activeLevel = __input.level;
         activeFoodPref = __input.foodPref;
         activeCuisine = __input.cuisine;
         var __t = calculateDailyTargets();
         var __m = runGlobalOptimization(__templates, __t);
         if (applyPracticalConstraints(__m, __t, {})) {
           rebalanceAfterPracticalAdjustments(__m, __t);
           applyPracticalConstraints(__m, __t, {});
         }`,
        context,
      );
      const targets = vm.runInContext("__t", context);
      const meals = vm.runInContext("__m", context);
      return clone({ targets, meals, totals: dailyTotals(meals) });
    },
  };
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

// Same final summation as generateDietReport().
function dailyTotals(meals) {
  let p = 0, c = 0, f = 0, fib = 0;
  for (const m of meals) {
    p += m.totals.p;
    c += m.totals.c;
    f += m.totals.f;
    fib += m.totals.fib;
  }
  return {
    cal: Math.round(p * 4 + c * 4 + f * 9),
    p: Math.round(p * 10) / 10,
    c: Math.round(c * 10) / 10,
    f: Math.round(f * 10) / 10,
    fib: Math.round(fib * 10) / 10,
  };
}

// ---------- inputs ----------

const GOALS = ["Weight Loss", "Lean Muscle Gain", "Weight Gain", "Body Recomposition", "Maintenance"];
const FREQS = ["0–1 Days", "2–3 Days", "4–5 Days", "6–7 Days"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const PREFS = ["Vegetarian", "Eggetarian", "Non-Vegetarian"];
const CUISINES = ["South Indian", "North Indian", "Mixed Indian"];
const PREFERRED_SETS = [
  [],
  ["Rice", "Chapati", "Oats", "Chicken", "Eggs"], // the legacy wizard's default chips
  ["Paneer", "Dal", "Curd"],
  ["Soya Chunks", "Peanut Butter", "Brown Bread", "Sweet Potato"],
  ["Milk", "Banana", "Apple"],
];
const BODIES = [
  { gender: "Male", age: 25, heightCm: 180, weightKg: 80, bodyFatPct: 18 },
  { gender: "Female", age: 30, heightCm: 165, weightKg: 60, bodyFatPct: 24 },
  { gender: "Male", age: 35, heightCm: 172, weightKg: 92, bodyFatPct: 28 },
  { gender: "Female", age: 42, heightCm: 158, weightKg: 74, bodyFatPct: 34 },
  { gender: "Male", age: 19, heightCm: 168, weightKg: 55 }, // body fat left blank
  { gender: "Female", age: 55, heightCm: 152, weightKg: 48 }, // body fat left blank
  { gender: "Male", age: 48, heightCm: 185, weightKg: 110, bodyFatPct: 31 },
];

const inputs = [];

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

const TEST_MATH_CASES = [
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

function runTestMathCase(tm, testCase) {
  const targets = tm.calculateDailyTargets(testCase.profile);
  const result = tm.runGlobalOptimization(testCase.templates, targets);
  const meals = tm.formatMeals(result.state);
  if (tm.applyPracticalConstraints(meals, targets, {})) {
    tm.rebalanceAfterPracticalAdjustments(meals, targets);
    tm.applyPracticalConstraints(meals, targets, {});
  }
  return clone({ targets, meals, totals: dailyTotals(meals) });
}

// ---------- main ----------

const engine = loadIndexHtmlEngine();
const tm = require(path.join(root, "scripts/legacy/test-math-engine.cjs"));
const started = Date.now();

const cases = inputs.map(({ id, ...input }) => {
  const t0 = Date.now();
  const output = engine.generate(input);
  process.stdout.write(`${id} ${Date.now() - t0}ms\n`);
  return { id, input, output };
});

const testMathCases = TEST_MATH_CASES.map((c) => {
  const input = inputs.find((i) => i.id === c.id);
  const wizardInput = { ...input };
  delete wizardInput.id;
  return {
    id: c.id,
    templates: c.templates,
    input: wizardInput,
    indexHtml: engine.optimizeTemplates(wizardInput, c.templates),
    testMath: runTestMathCase(tm, c),
  };
});

const out = {
  generatedBy: "scripts/legacy-fixtures.mjs",
  source: "legacy/index.html (primary), legacy/test_math.js (secondary)",
  tolerances: { cal: 20, protein: 2, fat: 2, carbs: 5, fiber: 5 },
  cases,
  testMathCases,
};
fs.writeFileSync(path.join(root, "tests/fixtures/legacy-outputs.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`wrote ${cases.length} cases + ${testMathCases.length} test_math cases in ${Date.now() - started}ms`);
