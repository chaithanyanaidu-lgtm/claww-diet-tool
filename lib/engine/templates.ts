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

const DAIRY_KEYS: FoodKey[] = ["milk", "curd", "paneer", "paneer_bhurji", "ghee"];
const MEAT_KEYS: FoodKey[] = ["chicken", "fish"];
const EGG_KEYS: FoodKey[] = ["eggs", "egg_whites"];

export function isFoodAllowed(key: FoodKey, filter: FoodFilter): boolean {
  const food = FOOD_DB[key];
  if (!food) return false;

  const pref = filter.foodPref as string;
  if (pref === "Vegan") {
    if (MEAT_KEYS.includes(key) || EGG_KEYS.includes(key) || DAIRY_KEYS.includes(key)) return false;
  } else if (pref === "Vegetarian") {
    if (MEAT_KEYS.includes(key) || EGG_KEYS.includes(key)) return false;
  } else if (pref === "Eggetarian") {
    if (MEAT_KEYS.includes(key)) return false;
  }

  // Substring match on the food name, plus keyword checks for dairy/ghee/vegan
  const name = food.name.toLowerCase();
  for (const word of filter.avoid) {
    if (name.includes(word)) return false;
    if (word === "dairy" && DAIRY_KEYS.includes(key)) return false;
    if (word === "vegan" && (DAIRY_KEYS.includes(key) || MEAT_KEYS.includes(key) || EGG_KEYS.includes(key))) return false;
    if (word === "meat" && MEAT_KEYS.includes(key)) return false;
    if (word === "egg" && EGG_KEYS.includes(key)) return false;
    if (word === "ghee" && key === "ghee") return false;
  }

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
  const lunchFat = pick("fat", ["ghee", "almonds", "peanuts"], ["almonds", "peanuts"]);

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
  const dinnerFat = pick("fat", ["ghee", "almonds", "peanuts"], ["almonds", "peanuts"]);

  return {
    breakfast: present([bfCarb, bfProtein, bfFat, bfFruit]),
    lunch: present([lunchCarb, lunchProtein, lunchFat, ifAllowed("curd"), ifAllowed("veg_curry"), ifAllowed("salad")]),
    snack: present([snackCarb, snackFat, snackFruit]),
    dinner: present([dinnerCarb, dinnerProtein, dinnerFat, ifAllowed("curd"), ifAllowed("veg_curry"), ifAllowed("salad")]),
  };
}

export type CarbFamily = "rice" | "chapati" | "bread" | "oats" | "poha" | "idli_dosa" | "sweet_potato" | "other";

export function getCarbFamily(key: FoodKey): CarbFamily {
  if (key === "rice" || key === "brown_rice") return "rice";
  if (key === "chapati") return "chapati";
  if (key === "bread") return "bread";
  if (key === "oats") return "oats";
  if (key === "poha") return "poha";
  if (key === "idli" || key === "dosa") return "idli_dosa";
  if (key === "sweet_potato") return "sweet_potato";
  return "other";
}

export function getAlternativeTemplates(
  filter: FoodFilter,
  mainCarbs?: Partial<Record<MealKey, FoodKey>>,
): Record<MealKey, FoodKey[][]> {
  const diet = filter.foodPref;
  const nonVeg = diet === "Non-Vegetarian";
  const eggetarian = diet === "Eggetarian";

  const allowed = (lists: FoodKey[][]) =>
    lists
      .map((list) => list.filter((k) => FOOD_DB[k] && isFoodAllowed(k, filter)))
      .filter((list) => list.length > 0);

  // Common side foods for main meals
  const altFat = isFoodAllowed("ghee", filter) ? "ghee" : isFoodAllowed("almonds", filter) ? "almonds" : "peanuts";
  const curd = isFoodAllowed("curd", filter) ? "curd" : null;
  const vegCurry = isFoodAllowed("veg_curry", filter) ? "veg_curry" : null;
  const salad = isFoodAllowed("salad", filter) ? "salad" : null;
  const sides = [altFat, curd, vegCurry, salad].filter(Boolean) as FoodKey[];

  // Protein pools
  const mainProteins: FoodKey[] = nonVeg
    ? ["fish", "chicken", "egg_whites", "eggs", "paneer_bhurji", "paneer", "soya", "dal"]
    : eggetarian
      ? ["eggs", "egg_whites", "paneer_bhurji", "paneer", "soya", "dal"]
      : ["paneer_bhurji", "paneer", "soya", "dal"];

  // Breakfast candidate generators
  const bfCarb = mainCarbs?.breakfast;
  const bfFamily = bfCarb ? getCarbFamily(bfCarb) : null;
  const allBfCarbs: FoodKey[] = ["bread", "oats", "poha", "idli", "dosa"];
  const sortedBfCarbs = bfFamily
    ? [...allBfCarbs.filter((c) => getCarbFamily(c) === bfFamily), ...allBfCarbs.filter((c) => getCarbFamily(c) !== bfFamily)]
    : allBfCarbs;

  const bfCandidates: FoodKey[][] = [];
  sortedBfCarbs.forEach((c) => {
    if (nonVeg || eggetarian) {
      bfCandidates.push([c, "eggs", "pb", "apple"]);
      bfCandidates.push([c, "egg_whites", "almonds", "banana"]);
      bfCandidates.push([c, "paneer", "peanuts", "apple"]);
      bfCandidates.push([c, "milk", "pb", "banana"]);
      bfCandidates.push([c, "eggs", "almonds", "banana"]);
    } else {
      bfCandidates.push([c, "paneer", "pb", "apple"]);
      bfCandidates.push([c, "milk", "almonds", "banana"]);
      bfCandidates.push([c, "paneer", "peanuts", "apple"]);
      bfCandidates.push([c, "milk", "pb", "apple"]);
    }
  });

  // Helper for lunch and dinner candidates
  const buildMainCandidates = (mainCarb?: FoodKey) => {
    const family = mainCarb ? getCarbFamily(mainCarb) : null;
    const allCarbs: FoodKey[] = family === "rice"
      ? ["rice", "brown_rice", "chapati"]
      : ["chapati", "rice", "brown_rice"];

    const candidates: FoodKey[][] = [];
    allCarbs.forEach((c) => {
      mainProteins.forEach((p) => {
        candidates.push([c, p, ...sides]);
      });
    });
    return candidates;
  };

  // Snack candidate generator
  const snackCarb = mainCarbs?.snack;
  const snackFamily = snackCarb ? getCarbFamily(snackCarb) : null;
  const allSnackCarbs: FoodKey[] = ["bread", "oats", "sweet_potato"];
  const sortedSnackCarbs = snackFamily
    ? [...allSnackCarbs.filter((c) => getCarbFamily(c) === snackFamily), ...allSnackCarbs.filter((c) => getCarbFamily(c) !== snackFamily)]
    : allSnackCarbs;

  const snackCandidates: FoodKey[][] = [];
  sortedSnackCarbs.forEach((c) => {
    snackCandidates.push([c, "pb", "apple"]);
    snackCandidates.push([c, "almonds", "banana"]);
    snackCandidates.push([c, "peanuts", "apple"]);
    snackCandidates.push([c, "pb", "banana"]);
    snackCandidates.push([c, "almonds", "apple"]);
    snackCandidates.push([c, "peanuts", "banana"]);
  });

  return {
    breakfast: allowed(bfCandidates),
    lunch: allowed(buildMainCandidates(mainCarbs?.lunch)),
    snack: allowed(snackCandidates),
    dinner: allowed(buildMainCandidates(mainCarbs?.dinner)),
  };
}
