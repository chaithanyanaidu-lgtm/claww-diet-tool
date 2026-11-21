"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PlanChat } from "@/components/chat/plan-chat";
import { Button } from "@/components/ui/button";
import { PRACTICAL_RULES, type PlanInput, type PlanReport } from "@/lib/engine";
import { fmt } from "@/lib/labels";
import { HowCalculated, Disclosure, SwapTable } from "./details-sections";
import { MealSection } from "./meal-section";
import { MACRO_LEGEND, Swatch } from "./plate";

function MacroBar({ report }: { report: PlanReport }) {
  const { p, c, f } = report.totals;
  const parts = [
    { color: "protein" as const, label: "Protein", grams: p, kcal: p * 4 },
    { color: "carbs" as const, label: "Carbs", grams: c, kcal: c * 4 },
    { color: "fat" as const, label: "Fat", grams: f, kcal: f * 9 },
  ];
  const total = parts.reduce((s, x) => s + x.kcal, 0) || 1;
  return (
    <>
      <div className="mt-5 flex h-2 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {parts.map((x) => (
          <div key={x.color} style={{ width: `${(x.kcal / total) * 100}%`, background: `var(--${x.color})` }} />
        ))}
      </div>
      <p className="num mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {parts.map((x) => (
          <span key={x.color} className="inline-flex items-center gap-1.5">
            <Swatch color={x.color} />
            {x.label} <span className="font-medium">{fmt.int(x.grams)} g</span>
            <span className="text-muted">({Math.round((x.kcal / total) * 100)}%)</span>
          </span>
        ))}
      </p>
      <p className="num mt-1 text-sm text-muted">
        Fiber <span className="font-medium text-ink">{fmt.int(report.totals.fib)} g</span>
      </p>
    </>
  );
}

function PlanTargetDeltas({ report }: { report: PlanReport }) {
  const t = report.targets;
  const s = report.totals;
  const tol = PRACTICAL_RULES.tolerances;
  const pHeadroom = t.protein * 0.10;

  const dCal = s.cal - t.targetCalories;
  const dP = Math.round((s.p - t.protein) * 10) / 10;
  const dC = Math.round((s.c - t.carbs) * 10) / 10;
  const dF = Math.round((s.f - t.fat) * 10) / 10;
  const dFib = Math.round((s.fib - t.fiber) * 10) / 10;

  const items = [
    { label: "Calories", target: t.targetCalories, plan: s.cal, delta: dCal, unit: "kcal", ok: Math.abs(dCal) <= tol.cal },
    { label: "Protein", target: t.protein, plan: s.p, delta: dP, unit: "g", ok: s.p >= t.protein - tol.protein && s.p <= t.protein + pHeadroom + tol.protein },
    { label: "Carbs", target: t.carbs, plan: s.c, delta: dC, unit: "g", ok: Math.abs(dC) <= tol.carbs },
    { label: "Fat", target: t.fat, plan: s.f, delta: dF, unit: "g", ok: Math.abs(dF) <= tol.fat },
    { label: "Fiber", target: t.fiber, plan: s.fib, delta: dFib, unit: "g", ok: s.fib >= t.fiber - tol.fiber },
  ];

  return (
    <div className="mt-4 rounded-xl border border-line bg-surface/50 p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span className="font-medium text-ink">Plan vs Daily Target</span>
        <span>tolerances: ±20 kcal, target–10% P, ±5g C, ±2g F</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {items.map((it) => (
          <div key={it.label} className="rounded-lg border border-line/60 bg-surface px-2.5 py-2 text-center">
            <span className="block text-xs text-muted">{it.label}</span>
            <span className="num text-sm font-semibold text-ink">
              {fmt.int(it.plan)} <span className="text-xs font-normal text-muted">{it.unit}</span>
            </span>
            <span
              className={`block text-[11px] font-medium ${
                it.ok ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
              }`}
            >
              {it.delta > 0 ? `+${it.delta}` : it.delta < 0 ? `−${Math.abs(it.delta)}` : "0"} {it.unit}
              <span className="text-muted font-normal"> (tgt {fmt.int(it.target)})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlanView({
  input,
  report,
  actions,
  children,
}: {
  input: PlanInput;
  report: PlanReport;
  actions?: ReactNode;
  /** Extra panels shown above the assistant, such as sharing controls. */
  children?: ReactNode;
}) {
  const [pdfState, setPdfState] = useState<"idle" | "busy" | "error">("idle");

  // Print shows the collapsed sections too.
  useEffect(() => {
    const open = () => document.querySelectorAll("details").forEach((d) => d.setAttribute("open", ""));
    window.addEventListener("beforeprint", open);
    return () => window.removeEventListener("beforeprint", open);
  }, []);

  async function onPdf() {
    setPdfState("busy");
    try {
      const { downloadPlanPdf } = await import("@/lib/pdf");
      await downloadPlanPdf(input, report);
      setPdfState("idle");
    } catch {
      setPdfState("error");
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
      <section aria-labelledby="plan-total" className="pt-4 pb-8">
        <h1 id="plan-total" className="text-display font-medium tracking-tight">
          {fmt.int(report.totals.cal)} <span className="text-lg font-normal text-muted">kcal a day</span>
        </h1>
        <MacroBar report={report} />
        <PlanTargetDeltas report={report} />

        <div className="no-print mt-6 flex flex-wrap gap-2">
          {actions}
          <Button variant="secondary" onClick={onPdf} disabled={pdfState === "busy"}>
            {pdfState === "busy" ? "Preparing PDF…" : "Download PDF"}
          </Button>
        </div>
        {pdfState === "error" && (
          <p role="alert" className="mt-2 text-sm text-danger">
            The PDF could not be created. Check your connection and try again, or print this page instead.
          </p>
        )}
      </section>

      <p className="no-print flex flex-wrap items-center gap-x-4 gap-y-1 pb-4 text-xs text-muted">
        <span>Rings show each food&apos;s share of the meal&apos;s calories, by its main nutrient:</span>
        {MACRO_LEGEND.map((l) => (
          <span key={l.color} className="inline-flex items-center gap-1.5">
            <Swatch color={l.color} />
            {l.label}
          </span>
        ))}
      </p>

      {report.meals.map((meal, i) => (
        <MealSection key={meal.key} meal={meal} alternatives={report.alternatives[meal.key]} index={i} />
      ))}

      <div className="mt-8 space-y-4">
        {children}
        <PlanChat input={input} />
      </div>

      <div className="mt-8">
        <Disclosure title="Swaps you can make">
          <SwapTable report={report} />
        </Disclosure>
        <Disclosure title="How this was calculated">
          <HowCalculated input={input} report={report} />
        </Disclosure>
      </div>
      <p className="border-t border-line pt-6 text-xs text-muted">General guidance, not medical advice.</p>
    </div>
  );
}
