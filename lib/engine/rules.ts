import type { Goal } from "./types";

// Real-world portion rules, unchanged from the legacy engine.
export const PRACTICAL_RULES = {
  snack: {
    pbMin: 10,
    pbPreferred: 15,
    pbBreadRatioMin: 0.12,
    bananaMaxWithBread: 150,
    minFatPerSnack: 8,
  },
  breakfast: {
    oatsHighThreshold: 80,
    minMilkWithHighOats: 200,
    minEggsWithHighOats: 100,
    minPaneerWithHighOats: 60,
    pbMinIfPresent: 10,
  },
  lunchDinner: {
    minChicken: 90,
    minFish: 90,
    minPaneer: 70,
    minDalMajor: 120,
    minCurdIfIncluded: 80,
  },
  distribution: {
    minFatCalorieSharePerMeal: 0.15,
    minFatCalorieSharePerMealByGoal: {
      "Weight Loss": 0.1,
      "Body Recomposition": 0.12,
      Maintenance: 0.15,
      "Lean Muscle Gain": 0.15,
      "Weight Gain": 0.15,
    } satisfies Record<Goal, number>,
    maxSingleItemCalorieShare: 0.7,
  },
  tolerances: {
    cal: 20,
    protein: 2,
    fat: 2,
    carbs: 5,
    fiber: 5,
  },
} as const;

/** Share of each meal in the day's calories: breakfast, lunch, snack, dinner. */
export const MEAL_CALORIE_SPLIT = [0.25, 0.35, 0.15, 0.25] as const;
