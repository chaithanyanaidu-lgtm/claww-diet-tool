import { describe, expect, it } from "vitest";
import { generatePlan, FOOD_DB, type MealKey, type PlanInput } from "@/lib/engine";

const MEAL_KEYS: MealKey[] = ["breakfast", "lunch", "snack", "dinner"];

const SAMPLE_PROFILES: PlanInput[] = [
  // 1. PDF Case study: Recomp Advanced Male
  {
    age: 34,
    heightCm: 170,
    weightKg: 79,
    bodyFatPct: 28,
    gender: "Male",
    goal: "Body Recomposition",
    frequency: "6–7 Days",
    level: "Advanced",
    foodPref: "Non-Vegetarian",
    cuisine: "Mixed Indian",
    preferredFoods: ["banana"],
    avoidFoods: [],
  },
  // 2. Weight Loss Beginner Male
  {
    age: 25,
    heightCm: 180,
    weightKg: 80,
    bodyFatPct: 18,
    gender: "Male",
    goal: "Weight Loss",
    frequency: "2–3 Days",
    level: "Beginner",
    foodPref: "Non-Vegetarian",
    cuisine: "Mixed Indian",
    preferredFoods: [],
    avoidFoods: [],
  },
  // 3. Lean Muscle Gain Intermediate Female
  {
    age: 30,
    heightCm: 165,
    weightKg: 60,
    bodyFatPct: 24,
    gender: "Female",
    goal: "Lean Muscle Gain",
    frequency: "4–5 Days",
    level: "Intermediate",
    foodPref: "Vegetarian",
    cuisine: "Mixed Indian",
    preferredFoods: [],
    avoidFoods: [],
  },
  // 4. North Indian Vegetarian
  {
    age: 35,
    heightCm: 172,
    weightKg: 92,
    bodyFatPct: 28,
    gender: "Male",
    goal: "Body Recomposition",
    frequency: "4–5 Days",
    level: "Advanced",
    foodPref: "Vegetarian",
    cuisine: "North Indian",
    preferredFoods: ["Paneer", "Chapati"],
    avoidFoods: [],
  },
  // 5. South Indian Eggetarian
  {
    age: 28,
    heightCm: 175,
    weightKg: 70,
    bodyFatPct: 15,
    gender: "Male",
    goal: "Maintenance",
    frequency: "4–5 Days",
    level: "Intermediate",
    foodPref: "Eggetarian",
    cuisine: "South Indian",
    preferredFoods: ["Eggs"],
    avoidFoods: [],
  },
  // 6. Vegan Avoid Dairy
  {
    age: 27,
    heightCm: 160,
    weightKg: 55,
    gender: "Female",
    goal: "Weight Loss",
    frequency: "2–3 Days",
    level: "Beginner",
    foodPref: "Vegetarian",
    cuisine: "Mixed Indian",
    preferredFoods: [],
    avoidFoods: ["dairy", "ghee"],
  },
];

describe("property tests: meal split, caps, warnings, alternatives, replacements", () => {
  it("enforces meal calorie distribution within intended band across profiles", () => {
    SAMPLE_PROFILES.forEach((profile) => {
      const report = generatePlan(profile);
      const splitTarget: Record<MealKey, number> = {
        breakfast: 0.25,
        lunch: 0.35,
        snack: 0.15,
        dinner: 0.25,
      };

      report.meals.forEach((meal) => {
        const expectedCal = report.targets.targetCalories * splitTarget[meal.key];
        const ratio = meal.totals.cal / expectedCal;
        // All meals should land within intended band (ratio between 0.70 and 1.50 for low-calorie profiles)
        expect(ratio, `${profile.goal} ${meal.key} calorie split ratio`).toBeGreaterThanOrEqual(0.70);
        expect(ratio, `${profile.goal} ${meal.key} calorie split ratio`).toBeLessThanOrEqual(1.50);
      });
    });
  });

  it("never lets rice reach the old 400g cap, respecting 250g max", () => {
    SAMPLE_PROFILES.forEach((profile) => {
      const report = generatePlan(profile);
      report.meals.forEach((meal) => {
        meal.foods.forEach((f) => {
          if (f.key === "rice" || f.key === "brown_rice") {
            expect(f.qty).toBeLessThanOrEqual(250);
          }
        });
      });
    });
  });

  it("emits target_miss_* warning whenever a macro exceeds engine tolerance", () => {
    SAMPLE_PROFILES.forEach((profile) => {
      const report = generatePlan(profile);
      const t = report.targets;
      const tot = report.totals;
      const warnings = report.warnings;

      // Calorie miss check
      if (Math.abs(tot.cal - t.targetCalories) > 20) {
        expect(warnings.some((w) => w.rule === "target_miss_cal")).toBe(true);
      }

      // Protein miss check (floor with 10% headroom and 2g tolerance)
      const pHeadroom = t.protein * 0.10;
      if (tot.p < t.protein - 2 || tot.p > t.protein + pHeadroom + 2) {
        expect(warnings.some((w) => w.rule === "target_miss_protein")).toBe(true);
      }

      // Carbs miss check (> 5g)
      if (Math.abs(tot.c - t.carbs) > 5) {
        expect(warnings.some((w) => w.rule === "target_miss_carbs")).toBe(true);
      }

      // Fat miss check (> 2g)
      if (Math.abs(tot.f - t.fat) > 2) {
        expect(warnings.some((w) => w.rule === "target_miss_fat")).toBe(true);
      }

      // Fiber miss check (below target by > 5g)
      if (tot.fib < t.fiber - 5) {
        expect(warnings.some((w) => w.rule === "target_miss_fiber")).toBe(true);
      }
    });
  });

  it("constrains every alternative: protein ±3g, calories ±5%, fiber ±4g, curd ≤150g", () => {
    SAMPLE_PROFILES.forEach((profile) => {
      const report = generatePlan(profile);
      report.meals.forEach((meal) => {
        const alts = report.alternatives[meal.key] || [];
        const mainChapati = meal.foods.find((f) => f.key === "chapati")?.qty ?? 0;
        const chapatiCap = Math.max(120, mainChapati);

        alts.forEach((alt) => {
          expect(Math.abs(alt.totals.p - meal.totals.p), `${meal.key} ${alt.label} protein diff`).toBeLessThanOrEqual(3.0);
          expect(
            Math.abs(alt.totals.cal - meal.totals.cal),
            `${meal.key} ${alt.label} cal diff`,
          ).toBeLessThanOrEqual(meal.totals.cal * 0.05 + 1);
          expect(Math.abs(alt.totals.fib - meal.totals.fib), `${meal.key} ${alt.label} fiber diff`).toBeLessThanOrEqual(4.0);

          const curd = alt.foods.find((f) => f.key === "curd");
          if (curd) expect(curd.qty).toBeLessThanOrEqual(150);

          const chapati = alt.foods.find((f) => f.key === "chapati");
          if (chapati) expect(chapati.qty).toBeLessThanOrEqual(chapatiCap);
        });
      });
    });
  });

  it("constrains every replacement: portion <= max portion, cal delta <= 15%", () => {
    SAMPLE_PROFILES.forEach((profile) => {
      const report = generatePlan(profile);
      report.replacements.forEach((r) => {
        const replFood = FOOD_DB[r.toKey];
        const origFood = FOOD_DB[r.fromKey];
        expect(r.toQty).toBeLessThanOrEqual(replFood.max);

        const origCal = Math.round(r.fromQty * origFood.cal);
        expect(Math.abs(r.calDelta) / origCal).toBeLessThanOrEqual(0.15 + 0.01);
      });
    });
  });

  it("never includes ghee or dairy when excluded by avoid or vegan", () => {
    const veganPlan = generatePlan({
      ...SAMPLE_PROFILES[0],
      foodPref: "Vegetarian",
      avoidFoods: ["dairy", "ghee"],
    });

    // Check main meals
    veganPlan.meals.forEach((m) => {
      m.foods.forEach((f) => {
        expect(f.key).not.toBe("ghee");
        expect(f.key).not.toBe("curd");
        expect(f.key).not.toBe("milk");
        expect(f.key).not.toBe("paneer");
      });
    });

    // Check alternatives
    MEAL_KEYS.forEach((k) => {
      (veganPlan.alternatives[k] || []).forEach((alt) => {
        alt.foods.forEach((f) => {
          expect(f.key).not.toBe("ghee");
          expect(f.key).not.toBe("curd");
          expect(f.key).not.toBe("milk");
          expect(f.key).not.toBe("paneer");
        });
      });
    });

    // Check replacements
    veganPlan.replacements.forEach((r) => {
      expect(r.fromKey).not.toBe("ghee");
      expect(r.toKey).not.toBe("ghee");
      expect(r.toKey).not.toBe("curd");
      expect(r.toKey).not.toBe("paneer");
    });
  });
});
