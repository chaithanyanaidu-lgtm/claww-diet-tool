import { describe, expect, it } from "vitest";
import { fieldErrors, PlanInputSchema, STEP_SCHEMAS } from "@/lib/schemas";

const valid = {
  age: 28,
  heightCm: 175,
  weightKg: 72,
  gender: "Male",
  goal: "Weight Loss",
  frequency: "2–3 Days",
  level: "Beginner",
  foodPref: "Non-Vegetarian",
  cuisine: "Mixed Indian",
  preferredFoods: ["Rice"],
  avoidFoods: ["curd"],
};

describe("PlanInputSchema", () => {
  it("accepts a complete input with body fat left blank", () => {
    expect(PlanInputSchema.safeParse(valid).success).toBe(true);
  });

  it("keeps the legacy en dash in frequency values", () => {
    expect(PlanInputSchema.safeParse({ ...valid, frequency: "2-3 Days" }).success).toBe(false);
  });

  it("says what is wrong and how to fix it", () => {
    const r = PlanInputSchema.safeParse({ ...valid, weightKg: 20, age: undefined });
    expect(r.success).toBe(false);
    const errs = fieldErrors(r.error!);
    expect(errs.weightKg).toBe("Enter your weight in kg, between 35 and 200.");
    expect(errs.age).toBe("Enter your age, between 15 and 80.");
  });

  it("rejects fractional ages and out-of-range body fat", () => {
    expect(PlanInputSchema.safeParse({ ...valid, age: 28.5 }).success).toBe(false);
    expect(PlanInputSchema.safeParse({ ...valid, bodyFatPct: 70 }).success).toBe(false);
  });

  it("validates one wizard step at a time", () => {
    expect(STEP_SCHEMAS[1].safeParse({ goal: "Maintenance" }).success).toBe(true);
    expect(STEP_SCHEMAS[0].safeParse({ goal: "Maintenance" }).success).toBe(false);
  });
});
