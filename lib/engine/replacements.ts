import { FOOD_DB, type FoodKey } from "./foods";
import { round1 } from "./optimize";
import type { Meal, Replacement, ReplacementBasis } from "./types";

const DEFINITIONS: { from: FoodKey; to: FoodKey; basis: ReplacementBasis; suitableFor: string }[] = [
  { from: "chicken", to: "paneer", basis: "protein", suitableFor: "Vegetarian / Dairy" },
  { from: "chicken", to: "soya", basis: "protein", suitableFor: "Vegetarian / Vegan" },
  { from: "rice", to: "chapati", basis: "carbs", suitableFor: "All" },
  { from: "rice", to: "bread", basis: "carbs", suitableFor: "All" },
  { from: "rice", to: "sweet_potato", basis: "carbs", suitableFor: "All" },
  { from: "paneer", to: "soya", basis: "protein", suitableFor: "Vegetarian / Vegan" },
  { from: "paneer", to: "dal", basis: "protein", suitableFor: "Vegetarian / Vegan" },
  { from: "milk", to: "curd", basis: "protein", suitableFor: "Dairy eaters" },
  { from: "banana", to: "apple", basis: "carbs", suitableFor: "All" },
  { from: "pb", to: "almonds", basis: "fat", suitableFor: "All" },
  { from: "pb", to: "peanuts", basis: "fat", suitableFor: "All" },
];

const NUTRIENT: Record<ReplacementBasis, "p" | "c" | "f"> = { protein: "p", carbs: "c", fat: "f" };

/** Equivalent-quantity swaps for foods in the plan, matched on one macro (whole-day quantity). */
export function calculateReplacements(meals: Meal[]): Replacement[] {
  const foodQuantities: Partial<Record<FoodKey, number>> = {};
  meals.forEach((meal) => {
    meal.foods.forEach((f) => {
      foodQuantities[f.key] = (foodQuantities[f.key] ?? 0) + f.qty;
    });
  });

  const replacements: Replacement[] = [];
  DEFINITIONS.forEach((def) => {
    const origQty = foodQuantities[def.from];
    if (!origQty || origQty <= 0) return;

    const origFood = FOOD_DB[def.from];
    const replFood = FOOD_DB[def.to];
    const n = NUTRIENT[def.basis];
    const replQty = Math.round(origQty * (origFood[n] / replFood[n]));

    replacements.push({
      fromKey: def.from,
      fromName: origFood.name,
      fromQty: Math.round(origQty),
      fromUnit: origFood.unit,
      toKey: def.to,
      toName: replFood.name,
      toQty: replQty,
      toUnit: replFood.unit,
      basis: def.basis,
      cal: Math.round(replQty * replFood.cal),
      p: round1(replQty * replFood.p),
      c: round1(replQty * replFood.c),
      f: round1(replQty * replFood.f),
      fib: round1(replQty * replFood.fib),
      suitableFor: def.suitableFor,
    });
  });

  return replacements;
}
