// Refactored copy of legacy/test_math.js: same engine code, test runner and debug logging removed, functions exported.
// Do not edit the engine code below; it is a reference for golden fixtures. legacy/test_math.js stays untouched.
/* eslint-disable */
// Test script for verifying the CLAWW Adaptive Nutrition Engine's math formulas and optimizer.
// Run using: node test_math.js

const FOOD_DB = {
  rice: { name: "Cooked White Rice", type: "carb", cal: 1.30, p: 0.027, c: 0.28, f: 0.003, fib: 0.004, min: 80, max: 400 },
  brown_rice: { name: "Cooked Brown Rice", type: "carb", cal: 1.11, p: 0.026, c: 0.23, f: 0.009, fib: 0.018, min: 80, max: 400 },
  chapati: { name: "Whole Wheat Chapati", type: "carb", cal: 2.67, p: 0.08, c: 0.53, f: 0.011, fib: 0.08, min: 40, max: 240 },
  bread: { name: "Brown Bread", type: "carb", cal: 2.65, p: 0.09, c: 0.43, f: 0.042, fib: 0.06, min: 28, max: 140 },
  oats: { name: "Oats (Dry)", type: "carb", cal: 3.89, p: 0.169, c: 0.66, f: 0.069, fib: 0.106, min: 30, max: 150 },
  sweet_potato: { name: "Sweet Potato (Boiled)", type: "carb", cal: 0.86, p: 0.016, c: 0.20, f: 0.001, fib: 0.03, min: 50, max: 300 },
  banana: { name: "Banana", type: "fruit", cal: 0.89, p: 0.011, c: 0.23, f: 0.003, fib: 0.026, min: 50, max: 200 },
  apple: { name: "Apple", type: "fruit", cal: 0.52, p: 0.003, c: 0.14, f: 0.002, fib: 0.024, min: 50, max: 200 },
  poha: { name: "Poha (Cooked)", type: "carb", cal: 1.30, p: 0.025, c: 0.29, f: 0.003, fib: 0.01, min: 50, max: 250 },
  idli: { name: "Idli", type: "carb", cal: 1.50, p: 0.04, c: 0.32, f: 0.005, fib: 0.015, min: 70, max: 210 },
  dosa: { name: "Dosa (Plain)", type: "carb", cal: 1.65, p: 0.035, c: 0.32, f: 0.025, fib: 0.01, min: 60, max: 180 },

  chicken: { name: "Chicken Breast (Cooked)", type: "protein", cal: 1.65, p: 0.31, c: 0.0, f: 0.036, fib: 0.0, min: 60, max: 250 },
  fish: { name: "Rohu / Surmai Fish (Grilled)", type: "protein", cal: 1.40, p: 0.20, c: 0.0, f: 0.06, fib: 0.0, min: 60, max: 250 },
  eggs: { name: "Whole Eggs (Boiled)", type: "protein", cal: 1.55, p: 0.13, c: 0.011, f: 0.11, fib: 0.0, min: 50, max: 250 },
  egg_whites: { name: "Egg Whites", type: "protein", cal: 0.52, p: 0.11, c: 0.007, f: 0.002, fib: 0.0, min: 33, max: 330 },
  paneer: { name: "Paneer", type: "protein", cal: 2.65, p: 0.18, c: 0.02, f: 0.20, fib: 0.0, min: 50, max: 250 },
  paneer_bhurji: { name: "Paneer Bhurji", type: "protein", cal: 2.0, p: 0.14, c: 0.03, f: 0.15, fib: 0.01, min: 50, max: 250 },
  soya: { name: "Soya Chunks (Dry)", type: "protein", cal: 3.45, p: 0.52, c: 0.33, f: 0.005, fib: 0.13, min: 20, max: 120 },
  dal: { name: "Dal (Cooked)", type: "protein", cal: 1.16, p: 0.09, c: 0.20, f: 0.004, fib: 0.05, min: 50, max: 300 },
  milk: { name: "Milk", type: "protein", cal: 0.61, p: 0.032, c: 0.048, f: 0.033, fib: 0.0, min: 100, max: 400 },
  curd: { name: "Low Fat Curd", type: "protein", cal: 0.43, p: 0.037, c: 0.047, f: 0.01, fib: 0.0, min: 50, max: 300 },

  pb: { name: "Peanut Butter", type: "fat", cal: 5.88, p: 0.25, c: 0.20, f: 0.50, fib: 0.06, min: 5, max: 40 },
  almonds: { name: "Almonds", type: "fat", cal: 5.79, p: 0.21, c: 0.22, f: 0.49, fib: 0.12, min: 5, max: 45 },
  peanuts: { name: "Peanuts", type: "fat", cal: 5.67, p: 0.26, c: 0.16, f: 0.49, fib: 0.09, min: 5, max: 45 },
  ghee: { name: "Pure Ghee", type: "fat", cal: 9.00, p: 0.0, c: 0.0, f: 1.0, fib: 0.0, min: 2, max: 15 },

  veg_curry: { name: "Mixed Vegetable Curry", type: "veg", cal: 0.65, p: 0.02, c: 0.10, f: 0.02, fib: 0.03, min: 50, max: 200 },
  salad: { name: "Carrot & Cucumber Salad", type: "veg", cal: 0.15, p: 0.006, c: 0.036, f: 0.001, fib: 0.015, min: 50, max: 200 }
};

const PRACTICAL_RULES = {
  snack: {
    pbMin: 10,
    pbPreferred: 15,
    pbBreadRatioMin: 0.12,
    bananaMaxWithBread: 150,
    minFatPerSnack: 8
  },
  breakfast: {
    oatsHighThreshold: 80,
    minMilkWithHighOats: 200,
    minEggsWithHighOats: 100,
    minPaneerWithHighOats: 60,
    pbMinIfPresent: 10
  },
  lunchDinner: {
    minChicken: 90,
    minFish: 90,
    minPaneer: 70,
    minDalMajor: 120,
    minCurdIfIncluded: 80
  },
  distribution: {
    minFatCalorieSharePerMeal: 0.15,
    minFatCalorieSharePerMealByGoal: {
      "Weight Loss": 0.10,
      "Body Recomposition": 0.12,
      "Maintenance": 0.15,
      "Lean Muscle Gain": 0.15,
      "Weight Gain": 0.15
    },
    maxSingleItemCalorieShare: 0.70
  },
  tolerances: {
    cal: 20,
    protein: 2,
    fat: 2,
    carbs: 5,
    fiber: 5
  }
};

function calculateDailyTargets(profile) {
  const { age, height, weight, bodyFat, gender, goal, frequency, level } = profile;
  
  let bmr = 0;
  if (gender === 'Male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  const activityMultipliers = {
    '0-1 Days': 1.2,
    '2-3 Days': 1.375,
    '4-5 Days': 1.55,
    '6-7 Days': 1.725
  };
  const multiplier = activityMultipliers[frequency] || 1.375;
  const maintenanceCal = bmr * multiplier;

  let goalAdjustment = 0;
  if (goal === 'Weight Loss') goalAdjustment = -500;
  else if (goal === 'Lean Muscle Gain') goalAdjustment = 300;
  else if (goal === 'Weight Gain') goalAdjustment = 500;
  else if (goal === 'Body Recomposition') goalAdjustment = -200;
  
  const targetCalories = maintenanceCal + goalAdjustment;

  let targetProtein = 0;
  let multiplierP = 0;
  if (level === 'Beginner') multiplierP = 1.6;
  else if (level === 'Intermediate') multiplierP = 1.9;
  else if (level === 'Advanced') multiplierP = 2.2;

  if (bodyFat > 25) {
    const leanBodyMass = weight * (1 - bodyFat / 100);
    targetProtein = leanBodyMass * multiplierP;
  } else {
    targetProtein = weight * multiplierP;
  }
  const proteinCalories = targetProtein * 4;

  let multiplierF = 0;
  if (level === 'Beginner') multiplierF = 0.6;
  else if (level === 'Intermediate') multiplierF = 0.8;
  else if (level === 'Advanced') multiplierF = 1.0;

  const targetFat = weight * multiplierF;
  const fatCalories = targetFat * 9;

  const remainingCalories = targetCalories - (proteinCalories + fatCalories);
  const targetCarbs = remainingCalories / 4;

  let targetFiber = 0;
  if (gender === 'Male') {
    targetFiber = Math.max(30, 14 * targetCalories / 1000);
  } else {
    targetFiber = Math.max(25, 14 * targetCalories / 1000);
  }

  return {
    goal: goal,
    targetCalories: Math.round(targetCalories),
    protein: Math.round(targetProtein * 10) / 10,
    fat: Math.round(targetFat * 10) / 10,
    carbs: Math.round(targetCarbs * 10) / 10,
    fiber: Math.round(targetFiber * 10) / 10
  };
}

function getPracticalMin(mealKey, foodKey, templates, targets) {
  const fd = FOOD_DB[foodKey];
  let newMin = fd.min;
  const targetCalVal = targets.targetCalories || targets.cal;

  if (mealKey.toLowerCase() === 'snack') {
    const r = PRACTICAL_RULES.snack;
    if (foodKey === 'pb') {
      const hasBread = templates.snack.includes('bread');
      const estimatedBread = 60;
      const targetPBMin = targetCalVal > 2000 ? r.pbPreferred : r.pbMin;
      let pbMinFromBread = Math.max(targetPBMin, r.pbBreadRatioMin * estimatedBread);
      const neededPBFromFat = Math.ceil(r.minFatPerSnack / 0.50);
      newMin = Math.max(pbMinFromBread, neededPBFromFat);
    }
    if (foodKey === 'almonds') {
      newMin = Math.ceil(r.minFatPerSnack / 0.49);
    }
    if (foodKey === 'peanuts') {
      newMin = Math.ceil(r.minFatPerSnack / 0.49);
    }
  }
  
  if (mealKey.toLowerCase() === 'breakfast') {
    const r = PRACTICAL_RULES.breakfast;
    const hasOats = templates.breakfast.includes('oats');
    if (hasOats) {
      if (foodKey === 'milk') newMin = r.minMilkWithHighOats;
      if (foodKey === 'eggs') newMin = r.minEggsWithHighOats;
      if (foodKey === 'paneer') newMin = r.minPaneerWithHighOats;
    }
    if (foodKey === 'pb') newMin = r.pbMinIfPresent;
  }
  
  if (mealKey.toLowerCase() === 'lunch' || mealKey.toLowerCase() === 'dinner') {
    const r = PRACTICAL_RULES.lunchDinner;
    if (foodKey === 'chicken') newMin = r.minChicken;
    if (foodKey === 'fish') newMin = r.minFish;
    if (foodKey === 'paneer') newMin = r.minPaneer;
    if (foodKey === 'paneer_bhurji') newMin = r.minPaneer;
    if (foodKey === 'dal') {
      const hasOtherProtein = templates[mealKey].some(x => ['chicken', 'fish', 'paneer', 'paneer_bhurji', 'soya', 'eggs'].includes(x));
      if (!hasOtherProtein) newMin = r.minDalMajor;
    }
    if (foodKey === 'curd') newMin = r.minCurdIfIncluded;
  }
  
  return newMin;
}

function runGlobalOptimization(templates, targets) {
  let state = [];
  const mealIndices = ['breakfast', 'lunch', 'snack', 'dinner'];
  
  mealIndices.forEach((mealKey, mealIndex) => {
    templates[mealKey].forEach(foodKey => {
      const fd = FOOD_DB[foodKey];
      const pMin = getPracticalMin(mealKey, foodKey, templates, targets);
      state.push({
        mealIndex,
        key: foodKey,
        qty: (pMin + fd.max) / 2,
        min: pMin,
        max: fd.max,
        cal: fd.cal,
        p: fd.p,
        c: fd.c,
        f: fd.f,
        fib: fd.fib
      });
    });
  });

  function getLoss(st, weights) {
    let totalP = 0, totalC = 0, totalF = 0, totalFib = 0;
    let mealCal = [0, 0, 0, 0];
    let mealF = [0, 0, 0, 0];
    
    st.forEach(s => {
      totalP += s.qty * s.p;
      totalC += s.qty * s.c;
      totalF += s.qty * s.f;
      totalFib += s.qty * s.fib;
      mealCal[s.mealIndex] += s.qty * s.cal;
      mealF[s.mealIndex] += s.qty * s.f;
    });

    let totalCal = totalP * 4 + totalC * 4 + totalF * 9;
    
    let dCal = totalCal - targets.targetCalories;
    let dP = totalP - targets.protein;
    let dC = totalC - targets.carbs;
    let dF = totalF - targets.fat;
    let dFib = totalFib - targets.fiber;
    
    let targetLoss = (dCal * dCal * weights.cal) + 
                     (dP * dP * weights.p) + 
                     (dC * dC * weights.c) + 
                     (dF * dF * weights.f) + 
                     (dFib * dFib * weights.fib);
    
    const mealRatios = [0.25, 0.35, 0.15, 0.25];
    let ratioLoss = 0;
    for (let i = 0; i < 4; i++) {
      const targetMealCal = targets.targetCalories * mealRatios[i];
      const dMealCal = mealCal[i] - targetMealCal;
      ratioLoss += dMealCal * dMealCal * 0.25;
    }

    // Add penalties for fat concentration, single item dominance, and completeness rules
    let penaltyLoss = 0;
    const dist = PRACTICAL_RULES.distribution;
    
    for (let i = 0; i < 4; i++) {
      const mealFoods = st.filter(s => s.mealIndex === i);
      const qtyMap = {};
      mealFoods.forEach(s => { qtyMap[s.key] = s.qty; });
      
      const has = (key) => qtyMap[key] !== undefined && qtyMap[key] > 0;
      const getQty = (key) => qtyMap[key] || 0;

      const mCal = mealCal[i];
      const mF = mealF[i];

      // Fat concentration
      const fatCal = mF * 9;
      const currentGoal = targets.goal || 'Maintenance';
      const minFatShareThreshold = dist.minFatCalorieSharePerMealByGoal[currentGoal] !== undefined
        ? dist.minFatCalorieSharePerMealByGoal[currentGoal]
        : dist.minFatCalorieSharePerMeal;
      if (mCal > 0) {
        const fatShare = fatCal / mCal;
        if (fatShare < minFatShareThreshold) {
          const diff = (minFatShareThreshold * mCal) - fatCal;
          penaltyLoss += diff * diff * 2.0;
        }
      }

      // Single item dominance
      mealFoods.forEach(s => {
        const itemCal = s.qty * s.cal;
        if (mCal > 0) {
          const share = itemCal / mCal;
          if (share > dist.maxSingleItemCalorieShare) {
            const diff = itemCal - (dist.maxSingleItemCalorieShare * mCal);
            penaltyLoss += diff * diff * 2.0;
          }
        }
      });

      // Breakfast companion protein & PB
      if (i === 0) {
        const r = PRACTICAL_RULES.breakfast;
        if (has('oats') && getQty('oats') > r.oatsHighThreshold) {
          let companionDiff = 0;
          if (has('milk')) companionDiff = Math.max(0, r.minMilkWithHighOats - getQty('milk'));
          else if (has('eggs')) companionDiff = Math.max(0, r.minEggsWithHighOats - getQty('eggs'));
          else if (has('paneer')) companionDiff = Math.max(0, r.minPaneerWithHighOats - getQty('paneer'));
          if (companionDiff > 0) {
            penaltyLoss += companionDiff * companionDiff * 15.0;
          }
        }
        if (has('pb') && getQty('pb') < r.pbMinIfPresent) {
          const diff = r.pbMinIfPresent - getQty('pb');
          penaltyLoss += diff * diff * 25.0;
        }
      }

      // Lunch & Dinner protein min & curd
      if (i === 1 || i === 3) {
        const r = PRACTICAL_RULES.lunchDinner;
        if (has('chicken') && getQty('chicken') < r.minChicken) {
          const diff = r.minChicken - getQty('chicken');
          penaltyLoss += diff * diff * 25.0;
        }
        if (has('fish') && getQty('fish') < r.minFish) {
          const diff = r.minFish - getQty('fish');
          penaltyLoss += diff * diff * 25.0;
        }
        if (has('paneer') && getQty('paneer') < r.minPaneer) {
          const diff = r.minPaneer - getQty('paneer');
          penaltyLoss += diff * diff * 25.0;
        }
        if (has('paneer_bhurji') && getQty('paneer_bhurji') < r.minPaneer) {
          const diff = r.minPaneer - getQty('paneer_bhurji');
          penaltyLoss += diff * diff * 25.0;
        }
        if (has('dal') && getQty('dal') < r.minDalMajor) {
          const hasOtherProtein = has('chicken') || has('fish') || has('paneer') || has('paneer_bhurji') || has('soya') || has('eggs');
          if (!hasOtherProtein) {
            const diff = r.minDalMajor - getQty('dal');
            penaltyLoss += diff * diff * 25.0;
          }
        }
        if (has('curd') && getQty('curd') < r.minCurdIfIncluded) {
          const diff = r.minCurdIfIncluded - getQty('curd');
          penaltyLoss += diff * diff * 25.0;
        }
      }

      // Snack PB & banana cap & min fat
      if (i === 2) {
        const r = PRACTICAL_RULES.snack;
        if (has('bread') && has('pb')) {
          const bread_g = getQty('bread');
          const pb_g = getQty('pb');
          const targetPBMin = targets.targetCalories > 2000 ? r.pbPreferred : r.pbMin;
          const minPB = Math.max(targetPBMin, r.pbBreadRatioMin * bread_g);
          if (pb_g < minPB) {
            const diff = minPB - pb_g;
            penaltyLoss += diff * diff * 25.0;
          }
        }
        if (getQty('bread') > 100) {
          if (has('pb')) {
            const pb_g = getQty('pb');
            const almondsQty = getQty('almonds');
            const peanutsQty = getQty('peanuts');
            if (pb_g < 12 && almondsQty < 10 && peanutsQty < 10) {
              const diff = 12 - pb_g;
              penaltyLoss += diff * diff * 25.0;
            }
          }
        }
        if (has('bread') && has('banana') && getQty('banana') > r.bananaMaxWithBread) {
          const diff = getQty('banana') - r.bananaMaxWithBread;
          penaltyLoss += diff * diff * 25.0;
        }
        // min fat per snack
        let currentFat = 0;
        mealFoods.forEach(s => { currentFat += s.qty * s.f; });
        if (currentFat < r.minFatPerSnack) {
          const diff = r.minFatPerSnack - currentFat;
          penaltyLoss += diff * diff * 250.0;
        }
      }
    }

    return targetLoss + ratioLoss + penaltyLoss;
  }

  let weights = { cal: 1, p: 25, c: 25, f: 100, fib: 25 };
  let bestState = state.map(s => ({...s}));
  let attempts = 0;
  let targetsSatisfied = false;

  while (!targetsSatisfied && attempts < 8) {
    let currentBestLoss = getLoss(bestState, weights);
    let steps = [15, 8, 4, 2, 1, 0.5, 0.1];
    
    for (let step of steps) {
      let improved = true;
      let iter = 0;
      while (improved && iter < 120) {
        improved = false;
        iter++;
        for (let i = 0; i < state.length; i++) {
          const originalQty = state[i].qty;
          
          state[i].qty = Math.min(state[i].max, originalQty + step);
          let lossUp = getLoss(state, weights);
          if (lossUp < currentBestLoss) {
            currentBestLoss = lossUp;
            bestState = state.map(s => ({...s}));
            improved = true;
            continue;
          }

          state[i].qty = Math.max(state[i].min, originalQty - step);
          let lossDown = getLoss(state, weights);
          if (lossDown < currentBestLoss) {
            currentBestLoss = lossDown;
            bestState = state.map(s => ({...s}));
            improved = true;
            continue;
          }

          state[i].qty = originalQty;
        }

        // Deterministic pairwise mutations to escape saddle points (calorie-neutral scaled swaps)
        for (let idx1 = 0; idx1 < state.length; idx1++) {
          for (let idx2 = 0; idx2 < state.length; idx2++) {
            if (idx1 === idx2) continue;
            
            const s1 = state[idx1];
            const s2 = state[idx2];
            const q1_orig = s1.qty;
            const q2_orig = s2.qty;
            
            const step2 = step * (s1.cal / s2.cal);
            
            s1.qty = Math.min(s1.max, q1_orig + step);
            s2.qty = Math.max(s2.min, q2_orig - step2);
            let lossMut = getLoss(state, weights);
            if (lossMut < currentBestLoss) {
              currentBestLoss = lossMut;
              bestState = state.map(s => ({...s}));
              improved = true;
              continue;
            }
            
            s1.qty = Math.max(s1.min, q1_orig - step);
            s2.qty = Math.min(s2.max, q2_orig + step2);
            lossMut = getLoss(state, weights);
            if (lossMut < currentBestLoss) {
              currentBestLoss = lossMut;
              bestState = state.map(s => ({...s}));
              improved = true;
              continue;
            }
            
            s1.qty = q1_orig;
            s2.qty = q2_orig;
          }
        }
      }
    }

    let totalP = 0, totalC = 0, totalF = 0, totalFib = 0;
    bestState.forEach(s => {
      totalP += s.qty * s.p;
      totalC += s.qty * s.c;
      totalF += s.qty * s.f;
      totalFib += s.qty * s.fib;
    });
    let totalCal = totalP * 4 + totalC * 4 + totalF * 9;

    const errCal = Math.abs(totalCal - targets.targetCalories);
    const errP = Math.abs(totalP - targets.protein);
    const errC = Math.abs(totalC - targets.carbs);
    const errF = Math.abs(totalF - targets.fat);
    const errFib = Math.abs(totalFib - targets.fiber);

    const t = PRACTICAL_RULES.tolerances;
    if (errCal <= t.cal && errP <= t.protein && errF <= t.fat && errC <= t.carbs && errFib <= t.fiber) {
      targetsSatisfied = true;
    } else {
      if (errCal > t.cal) weights.cal *= 8;
      if (errP > t.protein) weights.p *= 8;
      if (errC > t.carbs) weights.c *= 8;
      if (errF > t.fat) weights.f *= 8;
      if (errFib > t.fiber) weights.fib *= 8;
      
      state = bestState.map(s => ({...s}));
      attempts++;
    }
  }

  // Compute totals
  let totalP = 0, totalC = 0, totalF = 0, totalFib = 0;
  bestState.forEach(s => {
    const qty = Math.round(s.qty);
    totalP += qty * s.p;
    totalC += qty * s.c;
    totalF += qty * s.f;
    totalFib += qty * s.fib;
  });
  let totalCal = Math.round(totalP * 4 + totalC * 4 + totalF * 9);

  return {
    state: bestState,
    totals: {
      cal: totalCal,
      p: Math.round(totalP * 10) / 10,
      c: Math.round(totalC * 10) / 10,
      f: Math.round(totalF * 10) / 10,
      fib: Math.round(totalFib * 10) / 10
    }
  };
}

function formatMeals(bestState) {
  const mealNames = ["Breakfast", "Lunch", "Snack", "Dinner"];
  let meals = mealNames.map(name => ({ name, foods: [], totals: { cal: 0, p: 0, c: 0, f: 0, fib: 0 } }));
  
  bestState.forEach(s => {
    const foodItem = FOOD_DB[s.key];
    const roundedQty = Math.round(s.qty);
    meals[s.mealIndex].foods.push({
      key: s.key,
      name: foodItem.name,
      qty: roundedQty,
      unit: foodItem.unit || "g",
      cal: Math.round(roundedQty * s.cal),
      p: Math.round(roundedQty * s.p * 10) / 10,
      c: Math.round(roundedQty * s.c * 10) / 10,
      f: Math.round(roundedQty * s.f * 10) / 10,
      fib: Math.round(roundedQty * s.fib * 10) / 10
    });
  });

  meals.forEach(meal => {
    let cal = 0, p = 0, c = 0, f = 0, fib = 0;
    meal.foods.forEach(food => {
      cal += food.cal;
      p += food.p;
      c += food.c;
      f += food.f;
      fib += food.fib;
    });
    meal.totals = {
      cal: Math.round(cal),
      p: Math.round(p * 10) / 10,
      c: Math.round(c * 10) / 10,
      f: Math.round(f * 10) / 10,
      fib: Math.round(fib * 10) / 10
    };
  });

  return meals;
}

function scorePracticality(meals, goal) {
  let warnings = [];
  const currentGoal = goal || 'Maintenance';
  const dist = PRACTICAL_RULES.distribution;
  const minFatShareThreshold = dist.minFatCalorieSharePerMealByGoal[currentGoal] !== undefined
    ? dist.minFatCalorieSharePerMealByGoal[currentGoal]
    : dist.minFatCalorieSharePerMeal;
  meals.forEach(meal => {
    const foods = meal.foods;
    const foodMap = {};
    foods.forEach(f => { foodMap[f.key] = f.qty; });

    const has = (key) => foodMap[key] !== undefined && foodMap[key] > 0;
    const qty = (key) => foodMap[key] || 0;

    if (meal.name.toLowerCase() === 'snack') {
      const r = PRACTICAL_RULES.snack;
      if (has('bread') && has('pb')) {
        const bread_g = qty('bread');
        const pb_g = qty('pb');
        const minPB = Math.max(r.pbMin, r.pbBreadRatioMin * bread_g);
        if (pb_g < minPB) {
          warnings.push({
            mealName: meal.name,
            message: `Peanut butter portion is too low (${pb_g}g) for bread (${bread_g}g). Needs to be at least ${Math.round(minPB)}g.`,
            rule: 'snack_pb_ratio'
          });
        }
      }
      if (qty('bread') > 100) {
        const pb_g = qty('pb');
        const almonds_g = qty('almonds');
        const peanuts_g = qty('peanuts');
        const hasAltFat = almonds_g >= 10 || peanuts_g >= 10;
        if (pb_g < 12 && !hasAltFat) {
          warnings.push({
            mealName: meal.name,
            message: `Snack with >100g bread requires either peanut butter >= 12g or almonds/peanuts >= 10g.`,
            rule: 'snack_high_bread_fat'
          });
        }
      }
      if (has('bread') && has('banana') && qty('banana') > r.bananaMaxWithBread) {
        warnings.push({
          mealName: meal.name,
          message: `Banana portion (${qty('banana')}g) exceeds snack cap with bread. Cap at ${r.bananaMaxWithBread}g.`,
          rule: 'snack_banana_cap'
        });
      }
      let snackFat = 0;
      foods.forEach(f => {
        snackFat += f.qty * FOOD_DB[f.key].f;
      });
      if (snackFat < r.minFatPerSnack) {
        warnings.push({
          mealName: meal.name,
          message: `Snack fat is too low (${snackFat.toFixed(1)}g). Needs at least ${r.minFatPerSnack}g to prevent a dry meal.`,
          rule: 'snack_min_fat'
        });
      }
    }

    if (meal.name.toLowerCase() === 'breakfast') {
      const r = PRACTICAL_RULES.breakfast;
      if (has('oats') && qty('oats') > r.oatsHighThreshold) {
        const milkOk = has('milk') && qty('milk') >= r.minMilkWithHighOats;
        const eggsOk = has('eggs') && qty('eggs') >= r.minEggsWithHighOats;
        const paneerOk = has('paneer') && qty('paneer') >= r.minPaneerWithHighOats;
        if (!milkOk && !eggsOk && !paneerOk) {
          warnings.push({
            mealName: meal.name,
            message: `Oats > ${r.oatsHighThreshold}g requires companion protein: Milk >= 200ml, Eggs >= 100g, or Paneer >= 60g.`,
            rule: 'breakfast_high_oats_protein'
          });
        }
      }
      if (has('pb') && qty('pb') < r.pbMinIfPresent) {
        warnings.push({
          mealName: meal.name,
          message: `Peanut butter portion is too low (${qty('pb')}g). Enforce min ${r.pbMinIfPresent}g if present.`,
          rule: 'breakfast_pb_min'
        });
      }
    }

    if (meal.name.toLowerCase() === 'lunch' || meal.name.toLowerCase() === 'dinner') {
      const r = PRACTICAL_RULES.lunchDinner;
      if (has('chicken') && qty('chicken') < r.minChicken) {
        warnings.push({
          mealName: meal.name,
          message: `Chicken Breast portion is too low (${qty('chicken')}g). Enforce min ${r.minChicken}g.`,
          rule: 'main_chicken_min'
        });
      }
      if (has('fish') && qty('fish') < r.minFish) {
        warnings.push({
          mealName: meal.name,
          message: `Fish portion is too low (${qty('fish')}g). Enforce min ${r.minFish}g.`,
          rule: 'main_fish_min'
        });
      }
      if (has('paneer') && qty('paneer') < r.minPaneer) {
        warnings.push({
          mealName: meal.name,
          message: `Paneer portion is too low (${qty('paneer')}g). Enforce min ${r.minPaneer}g.`,
          rule: 'main_paneer_min'
        });
      }
      if (has('paneer_bhurji') && qty('paneer_bhurji') < r.minPaneer) {
        warnings.push({
          mealName: meal.name,
          message: `Paneer Bhurji portion is too low (${qty('paneer_bhurji')}g). Enforce min ${r.minPaneer}g.`,
          rule: 'main_paneer_bhurji_min'
        });
      }
      if (has('dal') && qty('dal') < r.minDalMajor) {
        const hasOtherProtein = has('chicken') || has('fish') || has('paneer') || has('paneer_bhurji') || has('soya') || has('eggs');
        if (!hasOtherProtein) {
          warnings.push({
            mealName: meal.name,
            message: `Dal portion is too low (${qty('dal')}g) as major protein source. Enforce min ${r.minDalMajor}g.`,
            rule: 'main_dal_major_min'
          });
        }
      }
      if (has('curd') && qty('curd') < r.minCurdIfIncluded) {
        warnings.push({
          mealName: meal.name,
          message: `Curd portion is too low (${qty('curd')}g). Enforce min ${r.minCurdIfIncluded}g if included.`,
          rule: 'main_curd_min'
        });
      }

      let hasCarb = foods.some(f => FOOD_DB[f.key].type === 'carb');
      let hasProtein = foods.some(f => FOOD_DB[f.key].type === 'protein');
      let hasVeg = foods.some(f => FOOD_DB[f.key].type === 'veg');
      if (!hasCarb || !hasProtein || !hasVeg) {
        warnings.push({
          mealName: meal.name,
          message: `Meal must contain a carb base, a major protein, and a vegetable/fiber component.`,
          rule: 'main_completeness'
        });
      }
    }

    const mealTotals = meal.totals;
    const fatCal = mealTotals.f * 9;
    const fatShare = fatCal / mealTotals.cal;
    if (mealTotals.cal > 0 && fatShare < minFatShareThreshold) {
      warnings.push({
        mealName: meal.name,
        message: `Fat calorie share is too low (${(fatShare*100).toFixed(1)}%). Enforce min ${(minFatShareThreshold*100).toFixed(0)}% of meal calories for goal '${currentGoal}'.`,
        rule: 'dist_fat_share'
      });
    }

    foods.forEach(f => {
      const foodItem = FOOD_DB[f.key];
      const itemCal = f.qty * foodItem.cal;
      const itemShare = itemCal / mealTotals.cal;
      if (mealTotals.cal > 0 && itemShare > dist.maxSingleItemCalorieShare) {
        warnings.push({
          mealName: meal.name,
          message: `Single item '${f.name}' dominates meal calories (${(itemShare*100).toFixed(1)}%). Maximum allowed is ${(dist.maxSingleItemCalorieShare*100).toFixed(0)}%.`,
          rule: 'dist_single_dominance'
        });
      }
    });
  });
  return warnings;
}

function isFoodAllowed(key, avoidedList, dietPref) {
  const food = FOOD_DB[key];
  if (!food) return false;
  
  const currentDiet = dietPref || "Vegetarian";
  if (currentDiet === 'Vegetarian') {
    if (['chicken', 'fish', 'eggs', 'egg_whites'].includes(key)) return false;
  } else if (currentDiet === 'Eggetarian') {
    if (['chicken', 'fish'].includes(key)) return false;
  }
  
  const matchesAvoid = avoidedList.some(word => food.name.toLowerCase().includes(word.toLowerCase()));
  if (matchesAvoid) return false;

  return true;
}

function getAlternativeTemplates(originalMeals, preferredFoods, avoidedList, dietPref) {
  const altTemplates = { breakfast: [], lunch: [], snack: [], dinner: [] };
  const diets = dietPref || "Vegetarian";

  const bfAltFoods = [
    ['bread', diets === 'Vegetarian' ? 'paneer' : 'eggs', 'pb', 'apple'],
    ['poha', diets === 'Vegetarian' ? 'milk' : 'egg_whites', 'almonds', 'banana'],
    ['idli', diets === 'Vegetarian' ? 'paneer' : 'eggs', 'peanuts', 'apple']
  ];
  altTemplates.breakfast = bfAltFoods.map(list => list.filter(k => FOOD_DB[k] && isFoodAllowed(k, avoidedList, diets)));

  altTemplates.lunch = [
    ['chapati', diets === 'Non-Vegetarian' ? 'fish' : 'soya', 'curd', 'veg_curry', 'salad'],
    ['brown_rice', diets === 'Non-Vegetarian' ? 'chicken' : 'dal', 'curd', 'veg_curry', 'salad'],
    ['chapati', diets === 'Non-Vegetarian' ? 'eggs' : 'paneer', 'curd', 'veg_curry', 'salad']
  ].map(list => list.filter(k => FOOD_DB[k] && isFoodAllowed(k, avoidedList, diets)));

  altTemplates.snack = [
    ['sweet_potato', 'almonds', 'apple'],
    ['oats', 'pb', 'banana'],
    ['bread', 'peanuts', 'apple']
  ].map(list => list.filter(k => FOOD_DB[k] && isFoodAllowed(k, avoidedList, diets)));

  altTemplates.dinner = [
    ['rice', diets === 'Non-Vegetarian' ? 'chicken' : 'dal', 'curd', 'veg_curry', 'salad'],
    ['chapati', diets === 'Non-Vegetarian' ? 'fish' : 'soya', 'curd', 'veg_curry', 'salad'],
    ['chapati', diets === 'Non-Vegetarian' ? 'eggs' : 'paneer', 'curd', 'veg_curry', 'salad']
  ].map(list => list.filter(k => FOOD_DB[k] && isFoodAllowed(k, avoidedList, diets)));

  if (altTemplates.lunch.length === 0) {
    if (diets === 'Non-Vegetarian') {
      altTemplates.lunch = [
        ['chapati', 'chicken', 'curd', 'veg_curry', 'salad'],
        ['brown_rice', 'fish', 'curd', 'veg_curry', 'salad']
      ];
    } else if (diets === 'Eggetarian') {
      altTemplates.lunch = [
        ['chapati', 'eggs', 'curd', 'veg_curry', 'salad'],
        ['brown_rice', 'eggs', 'curd', 'veg_curry', 'salad']
      ];
    } else {
      altTemplates.lunch = [
        ['chapati', 'paneer', 'curd', 'veg_curry', 'salad'],
        ['brown_rice', 'dal', 'curd', 'veg_curry', 'salad']
      ];
    }
    altTemplates.lunch = altTemplates.lunch.map(list => list.filter(k => FOOD_DB[k] && isFoodAllowed(k, avoidedList, diets)));
  }

  if (altTemplates.dinner.length === 0) {
    if (diets === 'Non-Vegetarian') {
      altTemplates.dinner = [
        ['rice', 'chicken', 'curd', 'veg_curry', 'salad'],
        ['chapati', 'fish', 'curd', 'veg_curry', 'salad']
      ];
    } else if (diets === 'Eggetarian') {
      altTemplates.dinner = [
        ['rice', 'eggs', 'curd', 'veg_curry', 'salad'],
        ['chapati', 'eggs', 'curd', 'veg_curry', 'salad']
      ];
    } else {
      altTemplates.dinner = [
        ['rice', 'dal', 'curd', 'veg_curry', 'salad'],
        ['chapati', 'paneer', 'curd', 'veg_curry', 'salad']
      ];
    }
    altTemplates.dinner = altTemplates.dinner.map(list => list.filter(k => FOOD_DB[k] && isFoodAllowed(k, avoidedList, diets)));
  }

  return altTemplates;
}

function optimizeSingleMeal(foodKeys, mealTargets, mealName, targets) {
  const validKeys = foodKeys.filter(key => {
    const fd = FOOD_DB[key];
    return fd && 
           Number.isFinite(fd.cal) && 
           Number.isFinite(fd.p) && 
           Number.isFinite(fd.c) && 
           Number.isFinite(fd.f) && 
           Number.isFinite(fd.fib) &&
           Number.isFinite(fd.min) &&
           Number.isFinite(fd.max);
  });

  if (validKeys.length === 0) {
    return { invalid: true, foods: [], totals: { cal: 0, p: 0, c: 0, f: 0, fib: 0 }, reason: "Alternative unavailable for current restrictions." };
  }

  let state = validKeys.map(key => {
    const fd = FOOD_DB[key];
    let newMin = fd.min;
    if (mealName && targets) {
      const nameLower = mealName.toLowerCase();
      const tempTemplates = { [nameLower]: validKeys };
      newMin = getPracticalMin(nameLower, key, tempTemplates, targets);
    }
    let initialQty = (newMin + fd.max) / 2;
    if (!Number.isFinite(initialQty)) initialQty = fd.min;
    return {
      key,
      qty: initialQty,
      min: newMin,
      max: fd.max,
      cal: fd.cal,
      p: fd.p,
      c: fd.c,
      f: fd.f,
      fib: fd.fib
    };
  });

  function getLoss(st) {
    let p = 0, c = 0, f = 0, fib = 0;
    st.forEach(s => {
      p += s.qty * s.p;
      c += s.qty * s.c;
      f += s.qty * s.f;
      fib += s.qty * s.fib;
    });
    let cal = p * 4 + c * 4 + f * 9;
    
    let dCal = cal - mealTargets.cal;
    let dP = p - mealTargets.p;
    let dC = c - mealTargets.c;
    let dF = f - mealTargets.f;
    let dFib = fib - mealTargets.fib;

    return (dCal * dCal) + (dP * dP * 25) + (dC * dC * 25) + (dF * dF * 100) + (dFib * dFib * 25);
  }

  let bestState = state.map(s => ({...s}));
  let bestLoss = getLoss(bestState);
  let steps = [10, 5, 2, 1, 0.5, 0.1];

  for (let step of steps) {
    let improved = true;
    let iter = 0;
    while (improved && iter < 100) {
      improved = false;
      iter++;
      for (let i = 0; i < state.length; i++) {
        const originalQty = state[i].qty;
        
        state[i].qty = Math.min(state[i].max, originalQty + step);
        let lossUp = getLoss(state);
        if (lossUp < bestLoss) {
          bestLoss = lossUp;
          bestState = state.map(s => ({...s}));
          improved = true;
          continue;
        }

        state[i].qty = Math.max(state[i].min, originalQty - step);
        let lossDown = getLoss(state);
        if (lossDown < bestLoss) {
          bestLoss = lossDown;
          bestState = state.map(s => ({...s}));
          improved = true;
          continue;
        }

        state[i].qty = originalQty;
      }
    }
  }

  let finalFoods = [];
  let totalCal = 0, totalP = 0, totalC = 0, totalF = 0, totalFib = 0;

  bestState.forEach(s => {
    let roundedQty = Math.round(s.qty);
    if (!Number.isFinite(roundedQty)) roundedQty = 0;
    const food = FOOD_DB[s.key];
    
    let fCal = Math.round(roundedQty * s.cal);
    let fP = Math.round(roundedQty * s.p * 10) / 10;
    let fC = Math.round(roundedQty * s.c * 10) / 10;
    let fF = Math.round(roundedQty * s.f * 10) / 10;
    let fFib = Math.round(roundedQty * s.fib * 10) / 10;

    if (!Number.isFinite(fCal)) fCal = 0;
    if (!Number.isFinite(fP)) fP = 0;
    if (!Number.isFinite(fC)) fC = 0;
    if (!Number.isFinite(fF)) fF = 0;
    if (!Number.isFinite(fFib)) fFib = 0;

    totalCal += fCal;
    totalP += fP;
    totalC += fC;
    totalF += fF;
    totalFib += fFib;

    finalFoods.push({
      key: s.key,
      name: food.name,
      qty: roundedQty,
      unit: food.unit || "g",
      cal: fCal,
      p: fP,
      c: fC,
      f: fF,
      fib: fFib
    });
  });

  if (!Number.isFinite(totalCal)) totalCal = 0;
  if (!Number.isFinite(totalP)) totalP = 0;
  if (!Number.isFinite(totalC)) totalC = 0;
  if (!Number.isFinite(totalF)) totalF = 0;
  if (!Number.isFinite(totalFib)) totalFib = 0;

  return {
    foods: finalFoods,
    totals: {
      cal: totalCal,
      p: totalP,
      c: totalC,
      f: totalF,
      fib: totalFib
    }
  };
}

function applyPracticalConstraints(meals, targets, context) {
  let adjusted = false;
  const targetCalVal = targets.targetCalories || targets.cal;

  meals.forEach(meal => {
    const foodMap = {};
    meal.foods.forEach(f => { foodMap[f.key] = f; });

    const has = (key) => foodMap[key] !== undefined && foodMap[key].qty > 0;
    const getFood = (key) => foodMap[key];

    if (meal.name.toLowerCase() === 'snack') {
      const r = PRACTICAL_RULES.snack;
      if (has('bread') && has('pb')) {
        const bread = getFood('bread');
        const pb = getFood('pb');
        const targetPBMin = targetCalVal > 2000 ? r.pbPreferred : r.pbMin;
        const requiredPB = Math.max(targetPBMin, r.pbBreadRatioMin * bread.qty);
        if (pb.qty < requiredPB) {
          pb.qty = Math.round(requiredPB);
          adjusted = true;
        }
      }
      if (has('bread') && getFood('bread').qty > 100) {
        if (has('pb')) {
          const pb = getFood('pb');
          const almondsQty = has('almonds') ? getFood('almonds').qty : 0;
          const peanutsQty = has('peanuts') ? getFood('peanuts').qty : 0;
          if (pb.qty < 12 && almondsQty < 10 && peanutsQty < 10) {
            pb.qty = 12;
            adjusted = true;
          }
        }
      }
      if (has('bread') && has('banana')) {
        const banana = getFood('banana');
        if (banana.qty > r.bananaMaxWithBread) {
          banana.qty = r.bananaMaxWithBread;
          adjusted = true;
        }
      }
      let currentFat = 0;
      meal.foods.forEach(f => {
        currentFat += f.qty * FOOD_DB[f.key].f;
      });
      if (currentFat < r.minFatPerSnack) {
        if (has('pb')) {
          const pb = getFood('pb');
          const neededPB = Math.ceil(r.minFatPerSnack / 0.50);
          if (pb.qty < neededPB) {
            pb.qty = neededPB;
            adjusted = true;
          }
        } else if (has('almonds')) {
          const almonds = getFood('almonds');
          const neededAlmonds = Math.ceil(r.minFatPerSnack / 0.49);
          if (almonds.qty < neededAlmonds) {
            almonds.qty = neededAlmonds;
            adjusted = true;
          }
        }
      }
    }

    if (meal.name.toLowerCase() === 'breakfast') {
      const r = PRACTICAL_RULES.breakfast;
      if (has('oats') && getFood('oats').qty > r.oatsHighThreshold) {
        if (has('milk') && getFood('milk').qty < r.minMilkWithHighOats) {
          getFood('milk').qty = r.minMilkWithHighOats;
          adjusted = true;
        } else if (has('eggs') && getFood('eggs').qty < r.minEggsWithHighOats) {
          getFood('eggs').qty = r.minEggsWithHighOats;
          adjusted = true;
        } else if (has('paneer') && getFood('paneer').qty < r.minPaneerWithHighOats) {
          getFood('paneer').qty = r.minPaneerWithHighOats;
          adjusted = true;
        }
      }
      if (has('pb') && getFood('pb').qty < r.pbMinIfPresent) {
        getFood('pb').qty = r.pbMinIfPresent;
        adjusted = true;
      }
    }

    if (meal.name.toLowerCase() === 'lunch' || meal.name.toLowerCase() === 'dinner') {
      const r = PRACTICAL_RULES.lunchDinner;
      if (has('chicken') && getFood('chicken').qty < r.minChicken) {
        getFood('chicken').qty = r.minChicken;
        adjusted = true;
      }
      if (has('fish') && getFood('fish').qty < r.minFish) {
        getFood('fish').qty = r.minFish;
        adjusted = true;
      }
      if (has('paneer') && getFood('paneer').qty < r.minPaneer) {
        getFood('paneer').qty = r.minPaneer;
        adjusted = true;
      }
      if (has('paneer_bhurji') && getFood('paneer_bhurji').qty < r.minPaneer) {
        getFood('paneer_bhurji').qty = r.minPaneer;
        adjusted = true;
      }
      if (has('dal') && getFood('dal').qty < r.minDalMajor) {
        const hasOtherProtein = has('chicken') || has('fish') || has('paneer') || has('paneer_bhurji') || has('soya') || has('eggs');
        if (!hasOtherProtein) {
          getFood('dal').qty = r.minDalMajor;
          adjusted = true;
        }
      }
      if (has('curd') && getFood('curd').qty < r.minCurdIfIncluded) {
        getFood('curd').qty = r.minCurdIfIncluded;
        adjusted = true;
      }
    }
  });

  meals.forEach(meal => {
    let cal = 0, p = 0, c = 0, f = 0, fib = 0;
    meal.foods.forEach(food => {
      const fd = FOOD_DB[food.key];
      food.cal = Math.round(food.qty * fd.cal);
      food.p = Math.round(food.qty * fd.p * 10) / 10;
      food.c = Math.round(food.qty * fd.c * 10) / 10;
      food.f = Math.round(food.qty * fd.f * 10) / 10;
      food.fib = Math.round(food.qty * fd.fib * 10) / 10;

      cal += food.qty * fd.cal;
      p += food.qty * fd.p;
      c += food.qty * fd.c;
      f += food.qty * fd.f;
      fib += food.qty * fd.fib;
    });

    meal.totals = {
      cal: Math.round(p * 4 + c * 4 + f * 9),
      p: Math.round(p * 10) / 10,
      c: Math.round(c * 10) / 10,
      f: Math.round(f * 10) / 10,
      fib: Math.round(fib * 10) / 10
    };
  });

  if (adjusted) {
    meals.forEach(m => { m.adjustedForUsability = true; });
  }

  return adjusted;
}

function rebalanceAfterPracticalAdjustments(meals, targets) {
  let state = [];
  meals.forEach((meal, mealIndex) => {
    meal.foods.forEach(f => {
      const fd = FOOD_DB[f.key];
      let newMin = fd.min;
      
      if (meal.name.toLowerCase() === 'snack') {
        const r = PRACTICAL_RULES.snack;
        if (f.key === 'pb') {
          const breadFood = meal.foods.find(x => x.key === 'bread');
          const bread_qty = breadFood ? breadFood.qty : 0;
          const targetPBMin = (targets.targetCalories || targets.cal) > 2000 ? r.pbPreferred : r.pbMin;
          let pbMinFromBread = Math.max(targetPBMin, r.pbBreadRatioMin * bread_qty);
          const neededPBFromFat = Math.ceil(r.minFatPerSnack / 0.50);
          newMin = Math.max(pbMinFromBread, neededPBFromFat);
        }
        if (f.key === 'almonds') {
          newMin = Math.ceil(r.minFatPerSnack / 0.49);
        }
        if (f.key === 'peanuts') {
          newMin = Math.ceil(r.minFatPerSnack / 0.49);
        }
      }
      if (meal.name.toLowerCase() === 'breakfast') {
        const r = PRACTICAL_RULES.breakfast;
        const oatsFood = meal.foods.find(x => x.key === 'oats');
        const oats_qty = oatsFood ? oatsFood.qty : 0;
        if (oats_qty > r.oatsHighThreshold) {
          if (f.key === 'milk') newMin = r.minMilkWithHighOats;
          if (f.key === 'eggs') newMin = r.minEggsWithHighOats;
          if (f.key === 'paneer') newMin = r.minPaneerWithHighOats;
        }
        if (f.key === 'pb') newMin = r.pbMinIfPresent;
      }
      if (meal.name.toLowerCase() === 'lunch' || meal.name.toLowerCase() === 'dinner') {
        const r = PRACTICAL_RULES.lunchDinner;
        if (f.key === 'chicken') newMin = r.minChicken;
        if (f.key === 'fish') newMin = r.minFish;
        if (f.key === 'paneer') newMin = r.minPaneer;
        if (f.key === 'paneer_bhurji') newMin = r.minPaneer;
        if (f.key === 'dal') {
          const hasOtherProtein = meal.foods.some(x => ['chicken', 'fish', 'paneer', 'paneer_bhurji', 'soya', 'eggs'].includes(x.key));
          if (!hasOtherProtein) newMin = r.minDalMajor;
        }
        if (f.key === 'curd') newMin = r.minCurdIfIncluded;
      }

      state.push({
        mealIndex,
        key: f.key,
        qty: f.qty,
        min: newMin,
        max: fd.max,
        cal: fd.cal,
        p: fd.p,
        c: fd.c,
        f: fd.f,
        fib: fd.fib
      });
    });
  });

  state.forEach(s => {
  });

  function getLoss(st, weights) {
    let totalP = 0, totalC = 0, totalF = 0, totalFib = 0;
    let mealCal = [0, 0, 0, 0];
    let mealF = [0, 0, 0, 0];
    st.forEach(s => {
      totalP += s.qty * s.p;
      totalC += s.qty * s.c;
      totalF += s.qty * s.f;
      totalFib += s.qty * s.fib;
      mealCal[s.mealIndex] += s.qty * s.cal;
      mealF[s.mealIndex] += s.qty * s.f;
    });
    let totalCal = totalP * 4 + totalC * 4 + totalF * 9;
    let dCal = totalCal - (targets.targetCalories || targets.cal);
    let dP = totalP - targets.protein;
    let dC = totalC - targets.carbs;
    let dF = totalF - targets.fat;
    let dFib = totalFib - targets.fiber;
    
    let targetLoss = (dCal * dCal * weights.cal) + 
                     (dP * dP * weights.p) + 
                     (dC * dC * weights.c) + 
                     (dF * dF * weights.f) + 
                     (dFib * dFib * weights.fib);
    
    const mealRatios = [0.25, 0.35, 0.15, 0.25];
    let ratioLoss = 0;
    for (let i = 0; i < 4; i++) {
      const targetMealCal = (targets.targetCalories || targets.cal) * mealRatios[i];
      const dMealCal = mealCal[i] - targetMealCal;
      ratioLoss += dMealCal * dMealCal * 0.25;
    }

    // Add penalties for fat concentration, single item dominance, and completeness rules
    let penaltyLoss = 0;
    const dist = PRACTICAL_RULES.distribution;
    
    for (let i = 0; i < 4; i++) {
      const mealFoods = st.filter(s => s.mealIndex === i);
      const qtyMap = {};
      mealFoods.forEach(s => { qtyMap[s.key] = s.qty; });
      
      const has = (key) => qtyMap[key] !== undefined && qtyMap[key] > 0;
      const getQty = (key) => qtyMap[key] || 0;

      const mCal = mealCal[i];
      const mF = mealF[i];

      // Fat concentration
      const fatCal = mF * 9;
      const currentGoal = targets.goal || 'Maintenance';
      const minFatShareThreshold = dist.minFatCalorieSharePerMealByGoal[currentGoal] !== undefined
        ? dist.minFatCalorieSharePerMealByGoal[currentGoal]
        : dist.minFatCalorieSharePerMeal;
      if (mCal > 0) {
        const fatShare = fatCal / mCal;
        if (fatShare < minFatShareThreshold) {
          const diff = (minFatShareThreshold * mCal) - fatCal;
          penaltyLoss += diff * diff * 2.0;
        }
      }

      // Single item dominance
      mealFoods.forEach(s => {
        const itemCal = s.qty * s.cal;
        if (mCal > 0) {
          const share = itemCal / mCal;
          if (share > dist.maxSingleItemCalorieShare) {
            const diff = itemCal - (dist.maxSingleItemCalorieShare * mCal);
            penaltyLoss += diff * diff * 2.0;
          }
        }
      });

      // Breakfast companion protein & PB
      if (i === 0) {
        const r = PRACTICAL_RULES.breakfast;
        if (has('oats') && getQty('oats') > r.oatsHighThreshold) {
          let companionDiff = 0;
          if (has('milk')) companionDiff = Math.max(0, r.minMilkWithHighOats - getQty('milk'));
          else if (has('eggs')) companionDiff = Math.max(0, r.minEggsWithHighOats - getQty('eggs'));
          else if (has('paneer')) companionDiff = Math.max(0, r.minPaneerWithHighOats - getQty('paneer'));
          if (companionDiff > 0) {
            penaltyLoss += companionDiff * companionDiff * 15.0;
          }
        }
        if (has('pb') && getQty('pb') < r.pbMinIfPresent) {
          const diff = r.pbMinIfPresent - getQty('pb');
          penaltyLoss += diff * diff * 25.0;
        }
      }

      // Lunch & Dinner protein min & curd
      if (i === 1 || i === 3) {
        const r = PRACTICAL_RULES.lunchDinner;
        if (has('chicken') && getQty('chicken') < r.minChicken) {
          const diff = r.minChicken - getQty('chicken');
          penaltyLoss += diff * diff * 25.0;
        }
        if (has('fish') && getQty('fish') < r.minFish) {
          const diff = r.minFish - getQty('fish');
          penaltyLoss += diff * diff * 25.0;
        }
        if (has('paneer') && getQty('paneer') < r.minPaneer) {
          const diff = r.minPaneer - getQty('paneer');
          penaltyLoss += diff * diff * 25.0;
        }
        if (has('paneer_bhurji') && getQty('paneer_bhurji') < r.minPaneer) {
          const diff = r.minPaneer - getQty('paneer_bhurji');
          penaltyLoss += diff * diff * 25.0;
        }
        if (has('dal') && getQty('dal') < r.minDalMajor) {
          const hasOtherProtein = has('chicken') || has('fish') || has('paneer') || has('paneer_bhurji') || has('soya') || has('eggs');
          if (!hasOtherProtein) {
            const diff = r.minDalMajor - getQty('dal');
            penaltyLoss += diff * diff * 25.0;
          }
        }
        if (has('curd') && getQty('curd') < r.minCurdIfIncluded) {
          const diff = r.minCurdIfIncluded - getQty('curd');
          penaltyLoss += diff * diff * 25.0;
        }
      }

      // Snack PB & banana cap & min fat
      if (i === 2) {
        const r = PRACTICAL_RULES.snack;
        if (has('bread') && has('pb')) {
          const bread_g = getQty('bread');
          const pb_g = getQty('pb');
          const targetPBMin = (targets.targetCalories || targets.cal) > 2000 ? r.pbPreferred : r.pbMin;
          const minPB = Math.max(targetPBMin, r.pbBreadRatioMin * bread_g);
          if (pb_g < minPB) {
            const diff = minPB - pb_g;
            penaltyLoss += diff * diff * 25.0;
          }
        }
        if (getQty('bread') > 100) {
          if (has('pb')) {
            const pb_g = getQty('pb');
            const almondsQty = getQty('almonds');
            const peanutsQty = getQty('peanuts');
            if (pb_g < 12 && almondsQty < 10 && peanutsQty < 10) {
              const diff = 12 - pb_g;
              penaltyLoss += diff * diff * 25.0;
            }
          }
        }
        if (has('bread') && has('banana') && getQty('banana') > r.bananaMaxWithBread) {
          const diff = getQty('banana') - r.bananaMaxWithBread;
          penaltyLoss += diff * diff * 25.0;
        }
        // min fat per snack
        let currentFat = 0;
        mealFoods.forEach(s => { currentFat += s.qty * s.f; });
        if (currentFat < r.minFatPerSnack) {
          const diff = r.minFatPerSnack - currentFat;
          penaltyLoss += diff * diff * 250.0;
        }
      }
    }

    return targetLoss + ratioLoss + penaltyLoss;
  }

  let weights = { cal: 1, p: 25, c: 25, f: 100, fib: 25 };
  let bestState = state.map(s => ({...s}));
  let targetsSatisfied = false;
  let attempts = 0;

  while (!targetsSatisfied && attempts < 8) {
    let currentBestLoss = getLoss(bestState, weights);
    let steps = [15, 8, 4, 2, 1, 0.5, 0.1];

    for (let step of steps) {
      let improved = true;
      let iter = 0;
      while (improved && iter < 120) {
        improved = false;
        iter++;
        for (let i = 0; i < state.length; i++) {
          const originalQty = state[i].qty;
          state[i].qty = Math.min(state[i].max, originalQty + step);
          let lossUp = getLoss(state, weights);
          if (lossUp < currentBestLoss) {
            currentBestLoss = lossUp;
            bestState = state.map(s => ({...s}));
            improved = true;
            continue;
          }
          state[i].qty = Math.max(state[i].min, originalQty - step);
          let lossDown = getLoss(state, weights);
          if (lossDown < currentBestLoss) {
            currentBestLoss = lossDown;
            bestState = state.map(s => ({...s}));
            improved = true;
            continue;
          }
          state[i].qty = originalQty;
        }

        // Deterministic pairwise mutations to escape saddle points (calorie-neutral scaled swaps)
        for (let idx1 = 0; idx1 < state.length; idx1++) {
          for (let idx2 = 0; idx2 < state.length; idx2++) {
            if (idx1 === idx2) continue;
            
            const s1 = state[idx1];
            const s2 = state[idx2];
            const q1_orig = s1.qty;
            const q2_orig = s2.qty;
            
            const step2 = step * (s1.cal / s2.cal);
            
            s1.qty = Math.min(s1.max, q1_orig + step);
            s2.qty = Math.max(s2.min, q2_orig - step2);
            let lossMut = getLoss(state, weights);
            if (lossMut < currentBestLoss) {
              currentBestLoss = lossMut;
              bestState = state.map(s => ({...s}));
              improved = true;
              continue;
            }
            
            s1.qty = Math.max(s1.min, q1_orig - step);
            s2.qty = Math.min(s2.max, q2_orig + step2);
            lossMut = getLoss(state, weights);
            if (lossMut < currentBestLoss) {
              currentBestLoss = lossMut;
              bestState = state.map(s => ({...s}));
              improved = true;
              continue;
            }
            
            s1.qty = q1_orig;
            s2.qty = q2_orig;
          }
        }
      }
    }

    let totalP = 0, totalC = 0, totalF = 0, totalFib = 0;
    bestState.forEach(s => {
      totalP += s.qty * s.p;
      totalC += s.qty * s.c;
      totalF += s.qty * s.f;
      totalFib += s.qty * s.fib;
    });
    let totalCal = totalP * 4 + totalC * 4 + totalF * 9;

    const errCal = Math.abs(totalCal - (targets.targetCalories || targets.cal));
    const errP = Math.abs(totalP - targets.protein);
    const errC = Math.abs(totalC - targets.carbs);
    const errF = Math.abs(totalF - targets.fat);
    const errFib = Math.abs(totalFib - targets.fiber);

    const t = PRACTICAL_RULES.tolerances;
    
    if (errCal <= t.cal && errP <= t.protein && errF <= t.fat && errC <= t.carbs && errFib <= t.fiber) {
      targetsSatisfied = true;
    } else {
      if (errCal > t.cal) weights.cal *= 8;
      if (errP > t.protein) weights.p *= 8;
      if (errC > t.carbs) weights.c *= 8;
      if (errF > t.fat) weights.f *= 8;
      if (errFib > t.fiber) weights.fib *= 8;
      state = bestState.map(s => ({...s}));
      attempts++;
    }
  }

  bestState.forEach(s => {
    const meal = meals[s.mealIndex];
    const food = meal.foods.find(f => f.key === s.key);
    if (food) {
      const fd = FOOD_DB[s.key];
      food.qty = Math.round(s.qty);
      food.cal = Math.round(food.qty * fd.cal);
      food.p = Math.round(food.qty * fd.p * 10) / 10;
      food.c = Math.round(food.qty * fd.c * 10) / 10;
      food.f = Math.round(food.qty * fd.f * 10) / 10;
      food.fib = Math.round(food.qty * fd.fib * 10) / 10;
    }
  });

  meals.forEach(meal => {
    let cal = 0, p = 0, c = 0, f = 0, fib = 0;
    meal.foods.forEach(food => {
      cal += food.p * 4 + food.c * 4 + food.f * 9;
      p += food.p;
      c += food.c;
      f += food.f;
      fib += food.fib;
    });
    meal.totals = {
      cal: Math.round(cal),
      p: Math.round(p * 10) / 10,
      c: Math.round(c * 10) / 10,
      f: Math.round(f * 10) / 10,
      fib: Math.round(fib * 10) / 10
    };
  });
}


module.exports = {
  FOOD_DB,
  PRACTICAL_RULES,
  calculateDailyTargets,
  runGlobalOptimization,
  formatMeals,
  scorePracticality,
  isFoodAllowed,
  getAlternativeTemplates,
  optimizeSingleMeal,
  applyPracticalConstraints,
  rebalanceAfterPracticalAdjustments,
};
