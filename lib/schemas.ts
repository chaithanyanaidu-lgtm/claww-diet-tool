import { z } from "zod";
import { PREFERRED_FOOD_OPTIONS } from "@/lib/engine/foods";

// Enum values match the legacy app exactly (including the en dash in frequencies) so legacy and
// new outputs stay comparable. Friendly labels live in the UI only.
export const GENDERS = ["Male", "Female"] as const;
export const GOALS = ["Weight Loss", "Lean Muscle Gain", "Weight Gain", "Body Recomposition", "Maintenance"] as const;
export const FREQUENCIES = ["0–1 Days", "2–3 Days", "4–5 Days", "6–7 Days"] as const;
export const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
export const FOOD_PREFS = ["Vegetarian", "Eggetarian", "Non-Vegetarian"] as const;
export const CUISINES = ["South Indian", "North Indian", "Mixed Indian"] as const;

const MAX_AVOID = 20;

const num = (label: string, min: number, max: number, unit: string, opts: { int?: boolean } = {}) => {
  const msg = `Enter your ${label}${unit ? ` in ${unit}` : ""}, between ${min} and ${max}.`;
  let s = z.number({ error: msg }).min(min, msg).max(max, msg);
  if (opts.int) s = s.int(`Enter your ${label} in whole years, between ${min} and ${max}.`);
  return s;
};

export const PlanInputSchema = z.object({
  age: num("age", 15, 80, "", { int: true }),
  heightCm: num("height", 130, 220, "cm"),
  weightKg: num("weight", 35, 200, "kg"),
  bodyFatPct: num("body fat", 5, 60, "%").optional(),
  gender: z.enum(GENDERS, { error: "Choose the sex used for your calorie formula." }),
  goal: z.enum(GOALS, { error: "Choose a goal." }),
  frequency: z.enum(FREQUENCIES, { error: "Choose how many days a week you train." }),
  level: z.enum(LEVELS, { error: "Choose your training experience." }),
  foodPref: z.enum(FOOD_PREFS, { error: "Choose a diet type." }),
  cuisine: z.enum(CUISINES, { error: "Choose a cuisine." }),
  preferredFoods: z.array(z.enum(PREFERRED_FOOD_OPTIONS)).max(PREFERRED_FOOD_OPTIONS.length),
  avoidFoods: z
    .array(z.string().trim().min(1).max(40, "Keep each food under 40 characters."))
    .max(MAX_AVOID, `List at most ${MAX_AVOID} foods to avoid.`),
});

export type PlanInputParsed = z.infer<typeof PlanInputSchema>;

/** Fields shown on each wizard step, in order. */
export const STEP_FIELDS = [
  ["age", "heightCm", "weightKg", "gender", "bodyFatPct"],
  ["goal"],
  ["frequency", "level"],
  ["foodPref", "cuisine"],
  ["preferredFoods", "avoidFoods"],
] as const satisfies readonly (readonly (keyof PlanInputParsed)[])[];

export type StepField = (typeof STEP_FIELDS)[number][number];

export const STEP_SCHEMAS = STEP_FIELDS.map((fields) =>
  PlanInputSchema.pick(Object.fromEntries(fields.map((f) => [f, true])) as Record<StepField, true>),
);

/** Turns a Zod error into one message per field (first issue wins). */
export function fieldErrors(error: z.ZodError): Partial<Record<StepField, string>> {
  const out: Partial<Record<StepField, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as StepField;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
