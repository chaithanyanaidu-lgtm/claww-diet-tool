import type { Cuisine, FoodPref, Frequency, Gender, Goal, Level, MealKey } from "@/lib/engine";

// Friendly, sentence-case labels for the legacy enum values. The values themselves never change.

export const GENDER_LABELS: Record<Gender, string> = { Male: "Male", Female: "Female" };

export const GOAL_OPTIONS: { value: Goal; label: string; hint: string }[] = [
  { value: "Weight Loss", label: "Weight loss", hint: "About 500 kcal under maintenance" },
  { value: "Lean Muscle Gain", label: "Lean muscle gain", hint: "About 300 kcal over maintenance" },
  { value: "Weight Gain", label: "Weight gain", hint: "About 500 kcal over maintenance" },
  { value: "Body Recomposition", label: "Body recomposition", hint: "About 200 kcal under maintenance, with high protein" },
  { value: "Maintenance", label: "Maintenance", hint: "Eat at maintenance to hold your weight" },
];

export const FREQUENCY_OPTIONS: { value: Frequency; label: string; hint: string }[] = [
  { value: "0–1 Days", label: "0–1 days a week", hint: "Mostly sitting; activity × 1.2" },
  { value: "2–3 Days", label: "2–3 days a week", hint: "Light training; activity × 1.375" },
  { value: "4–5 Days", label: "4–5 days a week", hint: "Regular training; activity × 1.55" },
  { value: "6–7 Days", label: "6–7 days a week", hint: "Hard training; activity × 1.725" },
];

export const LEVEL_OPTIONS: { value: Level; label: string; hint: string }[] = [
  { value: "Beginner", label: "Beginner", hint: "Under a year of training. 1.6 g protein per kg" },
  { value: "Intermediate", label: "Intermediate", hint: "One to three years. 1.9 g protein per kg" },
  { value: "Advanced", label: "Advanced", hint: "Three years or more. 2.2 g protein per kg" },
];

export const FOOD_PREF_OPTIONS: { value: FoodPref; label: string; hint: string }[] = [
  { value: "Vegetarian", label: "Vegetarian", hint: "No meat, fish or eggs" },
  { value: "Eggetarian", label: "Eggetarian", hint: "Vegetarian, plus eggs" },
  { value: "Non-Vegetarian", label: "Non-vegetarian", hint: "Includes chicken and fish" },
];

export const CUISINE_OPTIONS: { value: Cuisine; label: string; hint: string }[] = [
  { value: "South Indian", label: "South Indian", hint: "Idli or dosa mornings, rice at lunch" },
  { value: "North Indian", label: "North Indian", hint: "Chapati at lunch and dinner" },
  { value: "Mixed Indian", label: "Mixed Indian", hint: "Rice and chapati both" },
];

export const GOAL_LABELS = Object.fromEntries(GOAL_OPTIONS.map((o) => [o.value, o.label])) as Record<Goal, string>;

export const MEAL_LABELS: Record<MealKey, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

/** Plain-language food names for the UI (engine names keep legacy capitalisation). */
export function foodLabel(name: string): string {
  const lower = name.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

const nf0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

export const fmt = {
  int: (v: number) => nf0.format(Math.round(v)),
  one: (v: number) => nf1.format(Math.round(v * 10) / 10),
  kcal: (v: number) => `${nf0.format(Math.round(v))} kcal`,
  g: (v: number) => `${nf0.format(Math.round(v))} g`,
};
