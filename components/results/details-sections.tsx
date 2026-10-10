import type { ReactNode } from "react";
import { PRACTICAL_RULES, type PlanInput, type PlanReport, type PracticalRule } from "@/lib/engine";
import { FREQUENCY_OPTIONS, GOAL_LABELS, fmt, foodLabel } from "@/lib/labels";

export function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group border-t border-line">
      <summary className="flex items-center gap-3 py-5 text-base font-medium">
        <svg viewBox="0 0 12 12" className="disclosure-mark size-3 text-muted transition-transform" aria-hidden="true">
          <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {title}
      </summary>
      <div className="pb-8">{children}</div>
    </details>
  );
}

const BASIS_LABEL = { protein: "Protein", carbs: "Carbs", fat: "Fat" } as const;

export function SwapTable({ report }: { report: PlanReport }) {
  if (report.replacements.length === 0) {
    return <p className="text-sm text-muted">No standard swaps apply to the foods in this plan.</p>;
  }
  return (
    <>
      <p className="mb-4 max-w-[70ch] text-sm text-muted">
        Each swap matches the same amount of one nutrient. Amounts are for the whole day; split them across meals the same way.
      </p>
      <ul className="num text-sm sm:hidden">
        {report.replacements.map((r) => (
          <li key={`${r.fromKey}-${r.toKey}`} className="border-b border-line py-3">
            <p>
              {foodLabel(r.fromName)} <span className="text-muted">{fmt.int(r.fromQty)} {r.fromUnit}</span>
            </p>
            <p>
              <span className="text-muted">→ </span>
              {foodLabel(r.toName)} <span className="font-medium">{fmt.int(r.toQty)} {r.toUnit}</span>
            </p>
            <p className="text-xs text-muted">
              Matched on {BASIS_LABEL[r.basis].toLowerCase()} · {fmt.int(r.cal)} kcal
            </p>
          </li>
        ))}
      </ul>
      <div className="hidden sm:block">
        <table className="num w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th scope="col" className="py-2 pr-4 font-normal">Instead of</th>
              <th scope="col" className="py-2 pr-4 font-normal">Have</th>
              <th scope="col" className="py-2 pr-4 font-normal">Matched on</th>
              <th scope="col" className="py-2 text-right font-normal">kcal</th>
            </tr>
          </thead>
          <tbody>
            {report.replacements.map((r) => (
              <tr key={`${r.fromKey}-${r.toKey}`} className="border-b border-line">
                <td className="py-2.5 pr-4">
                  {foodLabel(r.fromName)} <span className="text-muted">{fmt.int(r.fromQty)} {r.fromUnit}</span>
                </td>
                <td className="py-2.5 pr-4">
                  {foodLabel(r.toName)} <span className="font-medium">{fmt.int(r.toQty)} {r.toUnit}</span>
                </td>
                <td className="py-2.5 pr-4">{BASIS_LABEL[r.basis]}</td>
                <td className="py-2.5 text-right">{fmt.int(r.cal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const WARNING_TEXT: Record<PracticalRule, string> = {
  snack_pb_ratio: "Peanut butter is light for the amount of bread.",
  snack_high_bread_fat: "A lot of bread with little fat alongside it.",
  snack_banana_cap: "Banana is over 150 g alongside bread.",
  snack_min_fat: "Low in fat, so it may feel dry.",
  breakfast_high_oats_protein: "A large oats portion without enough milk, eggs or paneer.",
  breakfast_pb_min: "Peanut butter is under 10 g.",
  main_chicken_min: "Chicken is under the usual 90 g portion.",
  main_fish_min: "Fish is under the usual 90 g portion.",
  main_paneer_min: "Paneer is under the usual 70 g portion.",
  main_paneer_bhurji_min: "Paneer bhurji is under the usual 70 g portion.",
  main_dal_major_min: "Dal is under 120 g while it is the main protein.",
  main_curd_min: "Curd is under 80 g.",
  main_completeness: "Missing a carb, a protein or a vegetable.",
  dist_fat_share: "Lower in fat than usual for this goal.",
  dist_single_dominance: "One food makes up most of the calories.",
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-line py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function HowCalculated({ input, report }: { input: PlanInput; report: PlanReport }) {
  const t = report.targets;
  const sexTerm = input.gender === "Male" ? "+ 5" : "− 161";
  const freq = FREQUENCY_OPTIONS.find((o) => o.value === input.frequency)?.label ?? input.frequency;
  const adj = t.goalAdjustment;
  const tol = PRACTICAL_RULES.tolerances;

  const accuracy = [
    { label: "Calories", target: t.targetCalories, actual: report.totals.cal, unit: "kcal", tol: tol.cal },
    { label: "Protein", target: t.protein, actual: report.totals.p, unit: "g", tol: tol.protein },
    { label: "Carbs", target: t.carbs, actual: report.totals.c, unit: "g", tol: tol.carbs },
    { label: "Fat", target: t.fat, actual: report.totals.f, unit: "g", tol: tol.fat },
    { label: "Fiber", target: t.fiber, actual: report.totals.fib, unit: "g", tol: tol.fiber },
  ];
  const offTarget = accuracy.filter((a) => Math.abs(a.actual - a.target) > a.tol);

  return (
    <div className="max-w-3xl">
      <dl>
        <Row label="Resting energy (BMR)">
          10 × {fmt.one(input.weightKg)} kg + 6.25 × {fmt.one(input.heightCm)} cm − 5 × {input.age} {sexTerm} ={" "}
          <strong className="font-medium">{fmt.kcal(t.bmr)}</strong>
          <span className="block text-xs text-muted">Mifflin-St Jeor equation</span>
        </Row>
        <Row label="Maintenance">
          BMR × {t.activityMultiplier} for {freq} = <strong className="font-medium">{fmt.kcal(t.maintenanceCal)}</strong>
        </Row>
        <Row label="Daily target">
          {fmt.int(t.maintenanceCal)} {adj < 0 ? "−" : "+"} {fmt.int(Math.abs(adj))} for {GOAL_LABELS[t.goal].toLowerCase()} ={" "}
          <strong className="font-medium">{fmt.kcal(t.targetCalories)}</strong>
        </Row>
        <Row label="Protein">
          {t.leanMassKg !== null ? (
            <>
              {t.proteinPerKg} g × {fmt.one(t.leanMassKg)} kg lean mass ({fmt.one(input.weightKg)} kg at {fmt.one(input.bodyFatPct ?? 0)}% body fat)
            </>
          ) : (
            <>
              {t.proteinPerKg} g × {fmt.one(input.weightKg)} kg body weight
            </>
          )}{" "}
          = <strong className="font-medium">{fmt.one(t.protein)} g</strong>
        </Row>
        <Row label="Fat">
          {t.fatPerKg} g × {fmt.one(input.weightKg)} kg = <strong className="font-medium">{fmt.one(t.fat)} g</strong>
        </Row>
        <Row label="Carbs">
          ({fmt.int(t.targetCalories)} − {fmt.int(t.proteinCalories)} from protein − {fmt.int(t.fatCalories)} from fat) ÷ 4 ={" "}
          <strong className="font-medium">{fmt.one(t.carbs)} g</strong>
        </Row>
        <Row label="Fiber">
          The larger of {input.gender === "Male" ? 30 : 25} g and 14 g per 1,000 kcal = <strong className="font-medium">{fmt.one(t.fiber)} g</strong>
        </Row>
      </dl>

      <h3 className="mt-8 mb-3 text-sm font-medium">How close the plan gets</h3>
      <div className="overflow-x-auto">
        <table className="num w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th scope="col" className="py-2 pr-4 font-normal">Nutrient</th>
              <th scope="col" className="py-2 pr-4 text-right font-normal">Target</th>
              <th scope="col" className="py-2 pr-4 text-right font-normal">In the plan</th>
              <th scope="col" className="py-2 text-right font-normal">Difference</th>
            </tr>
          </thead>
          <tbody>
            {accuracy.map((a) => {
              const d = a.actual - a.target;
              return (
                <tr key={a.label} className="border-b border-line">
                  <th scope="row" className="py-2.5 pr-4 text-left font-normal">{a.label}</th>
                  <td className="py-2.5 pr-4 text-right">{fmt.one(a.target)} {a.unit}</td>
                  <td className="py-2.5 pr-4 text-right">{fmt.one(a.actual)} {a.unit}</td>
                  <td className="py-2.5 text-right">
                    {d > 0 ? "+" : d < 0 ? "−" : ""}
                    {fmt.one(Math.abs(d))} {a.unit}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-[70ch] text-sm text-muted">
        {offTarget.length === 0
          ? "Every nutrient is within the engine's tolerance (20 kcal; 2 g protein and fat; 5 g carbs and fiber)."
          : `${offTarget.map((a) => a.label.toLowerCase()).join(", ").replace(/^./, (c) => c.toUpperCase())} ${offTarget.length === 1 ? "is" : "are"} outside the engine's tolerance. Real portion limits (for example, at least 90 g of chicken) keep the meals practical, and sometimes that costs some precision.`}
      </p>

      {report.warnings.length > 0 && (
        <>
          <h3 className="mt-8 mb-3 text-sm font-medium">Portion notes</h3>
          <ul className="max-w-[70ch] text-sm">
            {report.warnings.map((w, i) => (
              <li key={`${w.mealName}-${w.rule}-${i}`} className="border-b border-line py-2">
                <span className="font-medium">{w.mealName}:</span> {WARNING_TEXT[w.rule]}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
