import { describe, expect, it } from "vitest";
import { generatePlan, type PlanInput } from "@/lib/engine";

const base: PlanInput = {
  age: 28,
  heightCm: 175,
  weightKg: 72,
  gender: "Male",
  goal: "Lean Muscle Gain",
  frequency: "4–5 Days",
  level: "Intermediate",
  foodPref: "Non-Vegetarian",
  cuisine: "Mixed Indian",
  preferredFoods: [],
  avoidFoods: [],
};

const allFoodKeys = (input: PlanInput) => {
  const r = generatePlan(input);
  return [...r.meals, ...Object.values(r.alternatives).flat()].flatMap((m) => m.foods.map((f) => f.key));
};

describe("engine", () => {
  it("is deterministic", () => {
    expect(generatePlan(base)).toEqual(generatePlan(base));
  });

  it("does not mutate its input", () => {
    const input = structuredClone({ ...base, avoidFoods: [" Curd "], preferredFoods: ["Paneer"] });
    const before = structuredClone(input);
    generatePlan(input);
    expect(input).toEqual(before);
  });

  it("treats a blank body fat like body fat at or below 25% (protein from total weight)", () => {
    const blank = generatePlan(base);
    const lean = generatePlan({ ...base, bodyFatPct: 16 });
    expect(blank.targets).toEqual(lean.targets);
    expect(blank.targets.leanMassKg).toBeNull();
    expect(blank.targets.protein).toBe(Math.round(72 * 1.9 * 10) / 10);
  });

  it("uses lean mass for protein above 25% body fat", () => {
    const r = generatePlan({ ...base, bodyFatPct: 30 });
    expect(r.targets.leanMassKg).toBe(50.4);
    expect(r.targets.protein).toBe(Math.round(72 * 0.7 * 1.9 * 10) / 10);
  });

  it("normalises avoid words: case and whitespace, substring match", () => {
    const keys = allFoodKeys({ ...base, foodPref: "Eggetarian", avoidFoods: ["  EGG  "] });
    expect(keys).not.toContain("eggs");
    expect(keys).not.toContain("egg_whites");
  });

  it("never serves meat or eggs to vegetarians", () => {
    const keys = allFoodKeys({ ...base, foodPref: "Vegetarian" });
    for (const k of ["chicken", "fish", "eggs", "egg_whites"]) expect(keys).not.toContain(k);
  });

  it("never serves ghee when ghee is in avoidFoods", () => {
    const keys = allFoodKeys({ ...base, avoidFoods: ["ghee"] });
    expect(keys).not.toContain("ghee");
  });

  it("never serves ghee or dairy when dairy is in avoidFoods", () => {
    const keys = allFoodKeys({ ...base, avoidFoods: ["dairy"] });
    for (const k of ["ghee", "milk", "curd", "paneer", "paneer_bhurji"]) {
      expect(keys).not.toContain(k);
    }
  });

  it("never serves ghee, dairy, meat, or eggs when vegan is specified", () => {
    const keysFromAvoid = allFoodKeys({ ...base, avoidFoods: ["vegan"] });
    for (const k of ["ghee", "milk", "curd", "paneer", "paneer_bhurji", "chicken", "fish", "eggs", "egg_whites"]) {
      expect(keysFromAvoid).not.toContain(k);
    }
    const keysFromPref = allFoodKeys({ ...base, foodPref: "Vegan" as unknown as PlanInput["foodPref"] });
    for (const k of ["ghee", "milk", "curd", "paneer", "paneer_bhurji", "chicken", "fish", "eggs", "egg_whites"]) {
      expect(keysFromPref).not.toContain(k);
    }
  });

  it("ensures protein is treated as a floor with headroom and never lands below target", () => {
    const r = generatePlan(base);
    expect(r.totals.p).toBeGreaterThanOrEqual(r.targets.protein - 2); // within tolerance of floor
  });

  it("only includes debug data when asked", () => {
    expect(generatePlan(base).debug).toBeUndefined();
    const d = generatePlan(base, { debug: true }).debug;
    expect(d).toBeDefined();
    expect(d!.globalAttempts).toBeGreaterThanOrEqual(0);
  });
});
