import { generatePlan, PlanInput, Goal, Frequency, Level, Cuisine } from "../lib/engine/index";

export const GOALS: Goal[] = ["Weight Loss", "Lean Muscle Gain", "Weight Gain", "Body Recomposition", "Maintenance"];
export const FREQS: Frequency[] = ["0–1 Days", "2–3 Days", "4–5 Days", "6–7 Days"];
export const CUISINES: Cuisine[] = ["South Indian", "North Indian", "Mixed Indian"];

export const BODIES: { gender: "Male" | "Female"; age: number; heightCm: number; weightKg: number; bodyFatPct: number; level: Level }[] = [
  { gender: "Male", age: 25, heightCm: 180, weightKg: 80, bodyFatPct: 18, level: "Beginner" },
  { gender: "Female", age: 30, heightCm: 165, weightKg: 60, bodyFatPct: 24, level: "Intermediate" },
  { gender: "Male", age: 35, heightCm: 172, weightKg: 92, bodyFatPct: 28, level: "Advanced" },
  { gender: "Female", age: 42, heightCm: 158, weightKg: 74, bodyFatPct: 34, level: "Intermediate" },
];

export function generate240Profiles(): PlanInput[] {
  const profiles: PlanInput[] = [];
  for (const goal of GOALS) {
    for (const cuisine of CUISINES) {
      for (const freq of FREQS) {
        for (const body of BODIES) {
          profiles.push({
            age: body.age,
            heightCm: body.heightCm,
            weightKg: body.weightKg,
            bodyFatPct: body.bodyFatPct,
            gender: body.gender,
            goal,
            frequency: freq,
            level: body.level,
            foodPref: "Non-Vegetarian",
            cuisine,
            preferredFoods: [],
            avoidFoods: [],
          });
        }
      }
    }
  }
  return profiles;
}

export function runSweep(profiles = generate240Profiles()) {
  let riceCap400Count = 0;
  let riceCap250Count = 0;
  let riceEligible = 0;
  let dinnerUnder80 = 0;
  let calOff = 0;
  let pOffRaw = 0;
  let pOffHeadroom = 0;
  let cOff = 0;
  let fOff = 0;
  let fibOff = 0;
  let warnCount = 0;
  let ratioSum = 0;
  let maxRatio = 0;
  let minRatio = Infinity;
  const times: number[] = [];

  for (const p of profiles) {
    const t0 = performance.now();
    const report = generatePlan(p);
    times.push(performance.now() - t0);

    const lunch = report.meals.find((m) => m.key === "lunch")!;
    const dinner = report.meals.find((m) => m.key === "dinner")!;
    const targetDinnerCal = report.targets.targetCalories * 0.25;

    const lunchRice = lunch.foods.find((f) => f.key === "rice" || f.key === "brown_rice");
    if (p.cuisine !== "North Indian") {
      riceEligible++;
      if (lunchRice && lunchRice.qty >= 400) {
        riceCap400Count++;
      }
      if (lunchRice && lunchRice.qty >= 250) {
        riceCap250Count++;
      }
    }

    if (dinner.totals.cal < targetDinnerCal * 0.8) {
      dinnerUnder80++;
    }

    if (Math.abs(report.totals.cal - report.targets.targetCalories) > 20) calOff++;

    // Raw protein error (+/- 2g)
    const rawPErr = Math.abs(report.totals.p - report.targets.protein);
    if (rawPErr > 2) pOffRaw++;

    // Headroom protein error (target to target + 10%, +/- 2g)
    const pHeadroom = report.targets.protein * 0.10;
    if (report.totals.p < report.targets.protein - 2 || report.totals.p > report.targets.protein + pHeadroom + 2) {
      pOffHeadroom++;
    }

    if (Math.abs(report.totals.c - report.targets.carbs) > 5) cOff++;
    if (Math.abs(report.totals.f - report.targets.fat) > 2) fOff++;
    if (Math.abs(report.totals.fib - report.targets.fiber) > 5) fibOff++;
    if (report.warnings.length > 0) warnCount++;

    const ratio = lunch.totals.cal / (dinner.totals.cal || 1);
    ratioSum += ratio;
    if (ratio > maxRatio) maxRatio = ratio;
    if (ratio < minRatio) minRatio = ratio;
  }

  times.sort((a, b) => a - b);
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const p95Time = times[Math.floor(times.length * 0.95)];

  const result = {
    total: profiles.length,
    riceCap400Count,
    riceCap250Count,
    riceEligible,
    dinnerUnder80,
    calOff,
    pOffRaw,
    pOffHeadroom,
    cOff,
    fOff,
    fibOff,
    warnCount,
    avgRatio: Math.round((ratioSum / profiles.length) * 100) / 100,
    minRatio: Math.round(minRatio * 100) / 100,
    maxRatio: Math.round(maxRatio * 100) / 100,
    avgTimeMs: Math.round(avgTime * 10) / 10,
    p95TimeMs: Math.round(p95Time * 10) / 10,
  };
  return result;
}

if (process.argv[1]?.endsWith("sweep.ts") || process.argv[1]?.endsWith("sweep.js")) {
  console.log("Running 240-profile sweep...");
  const res = runSweep();
  console.log("Sweep results:", JSON.stringify(res, null, 2));
}

