import type { FoodKey } from "./foods";

export type Gender = "Male" | "Female";
export type Goal = "Weight Loss" | "Lean Muscle Gain" | "Weight Gain" | "Body Recomposition" | "Maintenance";
export type Frequency = "0–1 Days" | "2–3 Days" | "4–5 Days" | "6–7 Days";
export type Level = "Beginner" | "Intermediate" | "Advanced";
export type FoodPref = "Vegetarian" | "Eggetarian" | "Non-Vegetarian";
export type Cuisine = "South Indian" | "North Indian" | "Mixed Indian";

export interface PlanInput {
  age: number; // 15–80
  heightCm: number; // 130–220
  weightKg: number; // 35–200
  bodyFatPct?: number; // 5–60, optional
  gender: Gender;
  goal: Goal;
  frequency: Frequency;
  level: Level;
  foodPref: FoodPref;
  cuisine: Cuisine;
  preferredFoods: string[];
  avoidFoods: string[];
}

export type MealKey = "breakfast" | "lunch" | "snack" | "dinner";
export type MealName = "Breakfast" | "Lunch" | "Snack" | "Dinner";
export type FoodType = "carb" | "protein" | "fat" | "fruit" | "veg";
export type Unit = "g" | "ml";

/** Nutrients per gram (or ml), and sensible portion bounds. */
export interface Food {
  name: string;
  type: FoodType;
  cal: number;
  p: number;
  c: number;
  f: number;
  fib: number;
  unit: Unit;
  min: number;
  max: number;
}

/** Calories and grams of protein, carbs, fat and fiber. */
export interface Macros {
  cal: number;
  p: number;
  c: number;
  f: number;
  fib: number;
}

export interface Targets {
  goal: Goal;
  bmr: number;
  activityMultiplier: number;
  maintenanceCal: number;
  goalAdjustment: number;
  targetCalories: number;
  proteinPerKg: number;
  /** Lean mass in kg when body fat is above 25%, otherwise null (protein uses total weight). */
  leanMassKg: number | null;
  protein: number;
  proteinCalories: number;
  fatPerKg: number;
  fat: number;
  fatCalories: number;
  carbs: number;
  carbsCalories: number;
  fiber: number;
}

export interface FoodPortion extends Macros {
  key: FoodKey;
  name: string;
  qty: number;
  unit: Unit;
}

export interface Meal {
  key: MealKey;
  name: MealName;
  foods: FoodPortion[];
  totals: Macros;
  adjustedForUsability?: boolean;
}

export interface AltMeal {
  /** Position of the alternative template it came from (1-based), e.g. "Alternative 2". */
  label: string;
  foods: FoodPortion[];
  totals: Macros;
}

export type ReplacementBasis = "protein" | "carbs" | "fat";

export interface Replacement {
  fromKey: FoodKey;
  fromName: string;
  fromQty: number;
  fromUnit: Unit;
  toKey: FoodKey;
  toName: string;
  toQty: number;
  toUnit: Unit;
  basis: ReplacementBasis;
  /** Macros of the replacement quantity. */
  cal: number;
  p: number;
  c: number;
  f: number;
  fib: number;
  suitableFor: string;
}

export type PracticalRule =
  | "snack_pb_ratio"
  | "snack_high_bread_fat"
  | "snack_banana_cap"
  | "snack_min_fat"
  | "breakfast_high_oats_protein"
  | "breakfast_pb_min"
  | "main_chicken_min"
  | "main_fish_min"
  | "main_paneer_min"
  | "main_paneer_bhurji_min"
  | "main_dal_major_min"
  | "main_curd_min"
  | "main_completeness"
  | "dist_fat_share"
  | "dist_single_dominance";

export interface PracticalWarning {
  mealName: MealName;
  message: string;
  rule: PracticalRule;
}

export interface PlanDebug {
  globalAttempts: number;
  rebalanced: boolean;
  rebalanceAttempts: number;
  rejectedAlternatives: { meal: MealKey; label: string; rules: PracticalRule[]; invalid: boolean }[];
}

export interface PlanReport {
  engineVersion: string;
  targets: Targets;
  meals: Meal[];
  alternatives: Record<MealKey, AltMeal[]>;
  replacements: Replacement[];
  totals: Macros;
  warnings: PracticalWarning[];
  debug?: PlanDebug;
}
