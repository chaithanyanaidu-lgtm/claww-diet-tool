import { FOOD_DB, FOOD_KEYS, type FoodKey } from "./foods";
import type { FoodPref, FoodType, MealKey, PlanInput } from "./types";

export type Templates = Record<MealKey, FoodKey[]>;

/** What decides which foods may appear: diet type plus the avoid list. */
export interface FoodFilter {
  foodPref: FoodPref;
  /** Normalised avoid words (lower case, single spaces, no empties). */
  avoid: string[];
}

/** Lower-cases, trims and collapses whitespace; drops empty entries. */
export function normaliseFoodWords(words: string[]): string[] {
  return words.map((w) => w.trim().replace(/\s+/g, " ").toLowerCase()).filter((w) => w.length > 0);
}

export function makeFoodFilter(input: Pick<PlanInput, "foodPref" | "avoidFoods">): FoodFilter {
  return { foodPref: input.foodPref, avoid: normaliseFoodWords(input.avoidFoods) };
}

export function isFoodAllowed(key: FoodKey, filter: FoodFilter): boolean {
  const food = FOOD_DB[key];
  if (!food) return false;

  if (filter.foodPref === "Vegetarian") {
    if (key === "chicken" || key === "fish" || key === "eggs" || key === "egg_whites") return false;
  } else if (filter.foodPref === "Eggetarian") {
    if (key === "chicken" || key === "fish") return false;
  }

  // Substring match on the food name: "egg" removes whole eggs and egg whites.
  const name = food.name.toLowerCase();
  if (filter.avoid.some((word) => name.includes(word))) return false;

  return true;
}

export function pickMealFood(
  type: FoodType,
  choices: FoodKey[],
  fallback: FoodKey[],
  preferredFoods: string[],
  filter: FoodFilter,
): FoodKey | null {
  const allowedChoices = choices.filter((k) => isFoodAllowed(k, filter));
  if (allowedChoices.length === 0) {
    const allowedFallback = fallback.filter((k) => isFoodAllowed(k, filter));
    if (allowedFallback.length === 0) {
      const anyAllowed = FOOD_KEYS.filter((k) => FOOD_DB[k].type === type && isFoodAllowed(k, filter));
      return anyAllowed[0] ?? null;
    }
    return allowedFallback[0];
  }
  // Prioritise the user's preferred foods.
  const preferred = allowedChoices.filter((k) => {
    const name = FOOD_DB[k].name.toLowerCase();
    return preferredFoods.some((pf) => name.includes(pf));
  });
  if (preferred.length > 0) return preferred[0];
  return allowedChoices[0];
}

function present(keys: (FoodKey | null)[]): FoodKey[] {
  return keys.filter((k): k is FoodKey => Boolean(k));
}

export function getOriginalTemplates(input: PlanInput, filter: FoodFilter): Templates {
  const { cuisine, foodPref } = input;
  const preferred = normaliseFoodWords(input.preferredFoods);
  const pick = (type: FoodType, choices: FoodKey[], fallback: FoodKey[]) =>
    pickMealFood(type, choices, fallback, preferred, filter);
  const ifAllowed = (key: FoodKey) => (isFoodAllowed(key, filter) ? key : null);

  // Breakfast
  const bfCarb = pick("carb", cuisine === "South Indian" ? ["idli", "dosa", "poha", "oats"] : ["oats", "bread", "poha"], ["oats", "bread"]);
  const bfProtein = pick("protein", foodPref === "Vegetarian" ? ["milk", "paneer"] : ["eggs", "egg_whites", "milk"], ["milk", "eggs"]);
  const bfFat = pick("fat", ["pb", "almonds", "peanuts"], ["pb"]);
  const bfFruit = pick("fruit", ["banana", "apple"], ["banana"]);

  // Lunch
  const lunchCarb = pick("carb", cuisine === "North Indian" ? ["chapati"] : ["rice", "brown_rice", "chapati"], ["rice", "chapati"]);
  const lunchProtein = pick("protein", foodPref === "Non-Vegetarian" ? ["chicken", "fish"] : ["paneer", "soya", "dal"], ["paneer", "dal"]);

  // Snack
  const snackCarb = pick("carb", ["bread", "sweet_potato", "oats"], ["bread", "sweet_potato"]);
  const snackFat = pick("fat", ["pb", "almonds", "peanuts"], ["pb"]);
  const snackFruit = pick("fruit", ["apple", "banana"], ["apple"]);

  // Dinner
  const dinnerCarb = pick("carb", cuisine === "North Indian" ? ["chapati"] : ["chapati", "rice"], ["chapati", "rice"]);
  const dinnerProtein = pick(
    "protein",
    foodPref === "Non-Vegetarian" ? ["chicken", "paneer_bhurji", "eggs"] : ["paneer_bhurji", "paneer", "dal", "soya"],
    ["paneer_bhurji", "dal"],
  );

  return {
    breakfast: present([bfCarb, bfProtein, bfFat, bfFruit]),
    lunch: present([lunchCarb, lunchProtein, ifAllowed("curd"), ifAllowed("veg_curry"), ifAllowed("salad")]),
    snack: present([snackCarb, snackFat, snackFruit]),
    dinner: present([dinnerCarb, dinnerProtein, ifAllowed("curd"), ifAllowed("veg_curry"), ifAllowed("salad")]),
  };
}

export function getAlternativeTemplates(filter: FoodFilter): Record<MealKey, FoodKey[][]> {
  const diet = filter.foodPref;
  const veg = diet === "Vegetarian";
  const nonVeg = diet === "Non-Vegetarian";
  const allowed = (lists: FoodKey[][]) => lists.map((list) => list.filter((k) => FOOD_DB[k] && isFoodAllowed(k, filter)));

  // Unlike the legacy code, there is no "fallback if empty" branch: each list below always has
  // three entries (possibly emptied by the filter), so the legacy fallback could never run.
  return {
    breakfast: allowed([
      ["bread", veg ? "paneer" : "eggs", "pb", "apple"],
      ["poha", veg ? "milk" : "egg_whites", "almonds", "banana"],
      ["idli", veg ? "paneer" : "eggs", "peanuts", "apple"],
    ]),
    lunch: allowed([
      ["chapati", nonVeg ? "fish" : "soya", "curd", "veg_curry", "salad"],
      ["brown_rice", nonVeg ? "chicken" : "dal", "curd", "veg_curry", "salad"],
      ["chapati", nonVeg ? "eggs" : "paneer", "curd", "veg_curry", "salad"],
    ]),
    snack: allowed([
      ["sweet_potato", "almonds", "apple"],
      ["oats", "pb", "banana"],
      ["bread", "peanuts", "apple"],
    ]),
    dinner: allowed([
      ["rice", nonVeg ? "chicken" : "dal", "curd", "veg_curry", "salad"],
      ["chapati", nonVeg ? "fish" : "soya", "curd", "veg_curry", "salad"],
      ["chapati", nonVeg ? "eggs" : "paneer", "curd", "veg_curry", "salad"],
    ]),
  };
}
