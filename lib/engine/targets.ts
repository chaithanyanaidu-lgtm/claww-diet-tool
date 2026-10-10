import type { Frequency, Goal, Level, PlanInput, Targets } from "./types";

export const ACTIVITY_MULTIPLIERS: Record<Frequency, number> = {
  "0–1 Days": 1.2,
  "2–3 Days": 1.375,
  "4–5 Days": 1.55,
  "6–7 Days": 1.725,
};

export const GOAL_ADJUSTMENTS: Record<Goal, number> = {
  "Weight Loss": -500,
  "Lean Muscle Gain": 300,
  "Weight Gain": 500,
  "Body Recomposition": -200,
  Maintenance: 0,
};

export const PROTEIN_PER_KG: Record<Level, number> = { Beginner: 1.6, Intermediate: 1.9, Advanced: 2.2 };
export const FAT_PER_KG: Record<Level, number> = { Beginner: 0.6, Intermediate: 0.8, Advanced: 1.0 };

/** Lean mass is used for protein above this body fat percentage. */
export const LEAN_MASS_BODY_FAT_THRESHOLD = 25;

const round1 = (v: number) => Math.round(v * 10) / 10;

export function calculateDailyTargets(input: PlanInput): Targets {
  const { age, heightCm: height, weightKg: weight, bodyFatPct: bodyFat, gender, goal, frequency, level } = input;

  // Maintenance calories (Mifflin-St Jeor)
  const bmr =
    gender === "Male"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const multiplier = ACTIVITY_MULTIPLIERS[frequency] ?? 1.375;
  const maintenanceCal = bmr * multiplier;

  const goalAdjustment = GOAL_ADJUSTMENTS[goal] ?? 0;
  const targetCalories = maintenanceCal + goalAdjustment;

  // Protein: lean body mass when body fat is above 25%; a blank body fat uses total weight.
  const multiplierP = PROTEIN_PER_KG[level] ?? 0;
  let targetProtein: number;
  let leanBodyMass: number | null = null;
  if (bodyFat !== undefined && bodyFat > LEAN_MASS_BODY_FAT_THRESHOLD) {
    leanBodyMass = weight * (1 - bodyFat / 100);
    targetProtein = leanBodyMass * multiplierP;
  } else {
    targetProtein = weight * multiplierP;
  }
  const proteinCalories = targetProtein * 4;

  const multiplierF = FAT_PER_KG[level] ?? 0;
  const targetFat = weight * multiplierF;
  const fatCalories = targetFat * 9;

  // Carbohydrates fill the remaining calories.
  const remainingCalories = targetCalories - (proteinCalories + fatCalories);
  const targetCarbs = remainingCalories / 4;

  const targetFiber = Math.max(gender === "Male" ? 30 : 25, (14 * targetCalories) / 1000);

  return {
    goal,
    bmr: Math.round(bmr),
    activityMultiplier: multiplier,
    maintenanceCal: Math.round(maintenanceCal),
    goalAdjustment,
    targetCalories: Math.round(targetCalories),
    proteinPerKg: multiplierP,
    leanMassKg: leanBodyMass === null ? null : round1(leanBodyMass),
    protein: round1(targetProtein),
    proteinCalories: Math.round(proteinCalories),
    fatPerKg: multiplierF,
    fat: round1(targetFat),
    fatCalories: Math.round(fatCalories),
    carbs: round1(targetCarbs),
    carbsCalories: Math.round(targetCarbs * 4),
    fiber: round1(targetFiber),
  };
}
