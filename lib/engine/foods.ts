import type { Food } from "./types";

// Nutrition database. Values per 1 g (or 1 ml for milk). Order matters: the template picker's
// last-resort fallback takes the first allowed food of a type in this order.
export const FOOD_DB = {
  // Carbs
  rice: { name: "Cooked White Rice", type: "carb", cal: 1.3, p: 0.027, c: 0.28, f: 0.003, fib: 0.004, unit: "g", min: 80, max: 400 },
  brown_rice: { name: "Cooked Brown Rice", type: "carb", cal: 1.11, p: 0.026, c: 0.23, f: 0.009, fib: 0.018, unit: "g", min: 80, max: 400 },
  chapati: { name: "Whole Wheat Chapati", type: "carb", cal: 2.67, p: 0.08, c: 0.53, f: 0.011, fib: 0.08, unit: "g", min: 40, max: 240 },
  bread: { name: "Brown Bread", type: "carb", cal: 2.65, p: 0.09, c: 0.43, f: 0.042, fib: 0.06, unit: "g", min: 28, max: 140 },
  oats: { name: "Oats (Dry)", type: "carb", cal: 3.89, p: 0.169, c: 0.66, f: 0.069, fib: 0.106, unit: "g", min: 30, max: 150 },
  sweet_potato: { name: "Sweet Potato (Boiled)", type: "carb", cal: 0.86, p: 0.016, c: 0.2, f: 0.001, fib: 0.03, unit: "g", min: 50, max: 300 },
  banana: { name: "Banana", type: "fruit", cal: 0.89, p: 0.011, c: 0.23, f: 0.003, fib: 0.026, unit: "g", min: 50, max: 200 },
  apple: { name: "Apple", type: "fruit", cal: 0.52, p: 0.003, c: 0.14, f: 0.002, fib: 0.024, unit: "g", min: 50, max: 200 },
  poha: { name: "Poha (Cooked)", type: "carb", cal: 1.3, p: 0.025, c: 0.29, f: 0.003, fib: 0.01, unit: "g", min: 50, max: 250 },
  idli: { name: "Idli", type: "carb", cal: 1.5, p: 0.04, c: 0.32, f: 0.005, fib: 0.015, unit: "g", min: 70, max: 210 },
  dosa: { name: "Dosa (Plain)", type: "carb", cal: 1.65, p: 0.035, c: 0.32, f: 0.025, fib: 0.01, unit: "g", min: 60, max: 180 },

  // Proteins
  chicken: { name: "Chicken Breast (Cooked)", type: "protein", cal: 1.65, p: 0.31, c: 0.0, f: 0.036, fib: 0.0, unit: "g", min: 60, max: 250 },
  fish: { name: "Rohu / Surmai Fish (Grilled)", type: "protein", cal: 1.4, p: 0.2, c: 0.0, f: 0.06, fib: 0.0, unit: "g", min: 60, max: 250 },
  eggs: { name: "Whole Eggs (Boiled)", type: "protein", cal: 1.55, p: 0.13, c: 0.011, f: 0.11, fib: 0.0, unit: "g", min: 50, max: 250 },
  egg_whites: { name: "Egg Whites", type: "protein", cal: 0.52, p: 0.11, c: 0.007, f: 0.002, fib: 0.0, unit: "g", min: 33, max: 330 },
  paneer: { name: "Paneer", type: "protein", cal: 2.65, p: 0.18, c: 0.02, f: 0.2, fib: 0.0, unit: "g", min: 50, max: 250 },
  paneer_bhurji: { name: "Paneer Bhurji", type: "protein", cal: 2.0, p: 0.14, c: 0.03, f: 0.15, fib: 0.01, unit: "g", min: 50, max: 250 },
  soya: { name: "Soya Chunks (Dry)", type: "protein", cal: 3.45, p: 0.52, c: 0.33, f: 0.005, fib: 0.13, unit: "g", min: 20, max: 120 },
  dal: { name: "Dal (Cooked)", type: "protein", cal: 1.16, p: 0.09, c: 0.2, f: 0.004, fib: 0.05, unit: "g", min: 50, max: 300 },
  milk: { name: "Milk", type: "protein", cal: 0.61, p: 0.032, c: 0.048, f: 0.033, fib: 0.0, unit: "ml", min: 100, max: 400 },
  curd: { name: "Low Fat Curd", type: "protein", cal: 0.43, p: 0.037, c: 0.047, f: 0.01, fib: 0.0, unit: "g", min: 50, max: 300 },

  // Fats
  pb: { name: "Peanut Butter", type: "fat", cal: 5.88, p: 0.25, c: 0.2, f: 0.5, fib: 0.06, unit: "g", min: 5, max: 40 },
  almonds: { name: "Almonds", type: "fat", cal: 5.79, p: 0.21, c: 0.22, f: 0.49, fib: 0.12, unit: "g", min: 5, max: 45 },
  peanuts: { name: "Peanuts", type: "fat", cal: 5.67, p: 0.26, c: 0.16, f: 0.49, fib: 0.09, unit: "g", min: 5, max: 45 },
  ghee: { name: "Pure Ghee", type: "fat", cal: 9.0, p: 0.0, c: 0.0, f: 1.0, fib: 0.0, unit: "g", min: 2, max: 15 },

  // Vegetables
  veg_curry: { name: "Mixed Vegetable Curry", type: "veg", cal: 0.65, p: 0.02, c: 0.1, f: 0.02, fib: 0.03, unit: "g", min: 50, max: 200 },
  salad: { name: "Carrot & Cucumber Salad", type: "veg", cal: 0.15, p: 0.006, c: 0.036, f: 0.001, fib: 0.015, unit: "g", min: 50, max: 200 },
} as const satisfies Record<string, Food>;

export type FoodKey = keyof typeof FOOD_DB;

export const FOOD_KEYS = Object.keys(FOOD_DB) as FoodKey[];

export function food(key: FoodKey): Food {
  return FOOD_DB[key];
}

/** Chips offered in the wizard. Matched against food names by case-insensitive substring. */
export const PREFERRED_FOOD_OPTIONS = [
  "Rice",
  "Chapati",
  "Oats",
  "Chicken",
  "Eggs",
  "Paneer",
  "Soya Chunks",
  "Dal",
  "Milk",
  "Curd",
  "Peanut Butter",
  "Brown Bread",
  "Sweet Potato",
  "Banana",
  "Apple",
] as const;
