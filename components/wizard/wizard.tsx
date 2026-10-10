"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { generatePlan, PREFERRED_FOOD_OPTIONS, type Cuisine, type FoodPref, type Frequency, type Gender, type Goal, type Level } from "@/lib/engine";
import { CUISINE_OPTIONS, FOOD_PREF_OPTIONS, FREQUENCY_OPTIONS, GOAL_OPTIONS, LEVEL_OPTIONS } from "@/lib/labels";
import { readDraft, saveDraft, savePreview } from "@/lib/plan-store";
import { fieldErrors, PlanInputSchema, STEP_FIELDS, STEP_SCHEMAS, type StepField } from "@/lib/schemas";
import { ChipInput, ChipToggleGroup, ChoiceGroup, NumberField } from "./fields";

interface Form {
  age: string;
  heightCm: string;
  weightKg: string;
  bodyFatPct: string;
  gender?: Gender;
  goal?: Goal;
  frequency?: Frequency;
  level?: Level;
  foodPref?: FoodPref;
  cuisine?: Cuisine;
  preferredFoods: string[];
  avoidFoods: string[];
}

const EMPTY: Form = { age: "", heightCm: "", weightKg: "", bodyFatPct: "", preferredFoods: [], avoidFoods: [] };

const STEPS = [
  { title: "About you", intro: "Your calorie needs start from these numbers." },
  { title: "What's your goal?", intro: "This sets how far above or below maintenance you eat." },
  { title: "How do you train?", intro: "Training days set your activity level; experience sets protein and fat." },
  { title: "What do you eat?", intro: "Foods are chosen from these." },
  { title: "Likes and dislikes", intro: "Optional. Liked foods are picked first when they fit; avoided foods never appear." },
] as const;

const TOTAL = STEPS.length;

function num(v: string): number | undefined {
  const t = v.trim().replace(",", ".");
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

function toCandidate(form: Form) {
  return {
    ...form,
    age: num(form.age),
    heightCm: num(form.heightCm),
    weightKg: num(form.weightKg),
    bodyFatPct: num(form.bodyFatPct),
  };
}

function loadInitial(): { form: Form; step: number } {
  const d = readDraft();
  if (!d || typeof d !== "object") return { form: EMPTY, step: 0 };
  const form = { ...EMPTY, ...(d.form as Partial<Form>) };
  const step = typeof d.step === "number" && d.step >= 0 && d.step < TOTAL ? d.step : 0;
  return { form, step };
}

export function Wizard() {
  const router = useRouter();
  const [{ form: initialForm, step: initialStep }] = useState(loadInitial);
  const [form, setForm] = useState<Form>(initialForm);
  const [step, setStep] = useState(initialStep);
  const [errors, setErrors] = useState<Partial<Record<StepField, string>>>({});
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const firstRender = useRef(true);

  // Move focus to the new step's heading so screen readers announce it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  function validateStep(s: number, f: Form) {
    const result = STEP_SCHEMAS[s].safeParse(toCandidate(f));
    return result.success ? {} : fieldErrors(result.error);
  }

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    const next = { ...form, [key]: value };
    setForm(next);
    saveDraft({ form: next, step });
    if (tried) setErrors(validateStep(step, next));
  }

  function goTo(s: number) {
    setStep(s);
    setTried(false);
    setErrors({});
    saveDraft({ form, step: s });
    window.scrollTo({ top: 0 });
  }

  function focusFirstError(errs: Partial<Record<StepField, string>>) {
    const first = STEP_FIELDS[step].find((f) => errs[f]);
    if (!first) return;
    const el = formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`);
    el?.focus();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const errs = validateStep(step, form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      setTried(true);
      focusFirstError(errs);
      return;
    }
    if (step < TOTAL - 1) {
      goTo(step + 1);
      return;
    }
    const parsed = PlanInputSchema.safeParse(toCandidate(form));
    if (!parsed.success) {
      // A field on an earlier step is invalid (should not happen); send the user back to it.
      const errs = fieldErrors(parsed.error);
      const s = STEP_FIELDS.findIndex((fields) => fields.some((f) => errs[f as StepField]));
      setStep(Math.max(0, s));
      setErrors(errs);
      setTried(true);
      return;
    }
    setBusy(true);
    // Let the button label update before the engine runs (it takes well under a second).
    setTimeout(() => {
      const report = generatePlan(parsed.data);
      savePreview(parsed.data, report);
      // Coming back to edit starts at step 1 with every answer kept.
      saveDraft({ form, step: 0 });
      router.push("/plan/preview");
    }, 0);
  }

  // Enter on a radio or checkbox advances, like it does in a text field.
  function onKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    const t = e.target as HTMLInputElement;
    if (e.key === "Enter" && t.tagName === "INPUT" && (t.type === "radio" || t.type === "checkbox")) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  const progress = ((step + 1) / TOTAL) * 100;

  return (
    <form ref={formRef} onSubmit={onSubmit} onKeyDown={onKeyDown} noValidate className="flex flex-1 flex-col">
      <div className="mb-8">
        <p className="num text-xs text-muted" aria-live="polite">
          Step {step + 1} of {TOTAL}
        </p>
        <div className="mt-2 h-0.5 w-full bg-line" aria-hidden="true">
          <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <h1 ref={headingRef} tabIndex={-1} className="text-lg font-medium outline-none">
        {STEPS[step].title}
      </h1>
      <p className="mt-1 text-sm text-muted">{STEPS[step].intro}</p>

      <div className="mt-8 flex flex-col gap-6">
        {step === 0 && (
          <>
            <div className="grid grid-cols-1 gap-6 min-[400px]:grid-cols-3 min-[400px]:gap-3">
              <NumberField name="age" label="Age" unit="yrs" integer value={form.age} error={errors.age} onChange={(v) => update("age", v)} />
              <NumberField name="heightCm" label="Height" unit="cm" value={form.heightCm} error={errors.heightCm} onChange={(v) => update("heightCm", v)} />
              <NumberField name="weightKg" label="Weight" unit="kg" value={form.weightKg} error={errors.weightKg} onChange={(v) => update("weightKg", v)} />
            </div>
            <ChoiceGroup
              name="gender"
              legend="Sex"
              hint="Used in the calorie formula."
              columns
              options={[
                { value: "Male", label: "Male" },
                { value: "Female", label: "Female" },
              ]}
              value={form.gender}
              error={errors.gender}
              onChange={(v) => update("gender", v)}
            />
            <NumberField
              name="bodyFatPct"
              label="Body fat (optional)"
              unit="%"
              hint="Leave blank if you don't know."
              value={form.bodyFatPct}
              error={errors.bodyFatPct}
              onChange={(v) => update("bodyFatPct", v)}
            />
          </>
        )}

        {step === 1 && (
          <ChoiceGroup name="goal" legend="Goal" options={GOAL_OPTIONS} value={form.goal} error={errors.goal} onChange={(v) => update("goal", v)} />
        )}

        {step === 2 && (
          <>
            <ChoiceGroup
              name="frequency"
              legend="Training days per week"
              options={FREQUENCY_OPTIONS}
              value={form.frequency}
              error={errors.frequency}
              onChange={(v) => update("frequency", v)}
            />
            <ChoiceGroup name="level" legend="Experience" options={LEVEL_OPTIONS} value={form.level} error={errors.level} onChange={(v) => update("level", v)} />
          </>
        )}

        {step === 3 && (
          <>
            <ChoiceGroup name="foodPref" legend="Diet" options={FOOD_PREF_OPTIONS} value={form.foodPref} error={errors.foodPref} onChange={(v) => update("foodPref", v)} />
            <ChoiceGroup name="cuisine" legend="Cuisine" options={CUISINE_OPTIONS} value={form.cuisine} error={errors.cuisine} onChange={(v) => update("cuisine", v)} />
          </>
        )}

        {step === 4 && (
          <>
            <ChipToggleGroup
              legend="Foods you like"
              hint="Picked first where they fit the meal."
              options={PREFERRED_FOOD_OPTIONS}
              selected={form.preferredFoods}
              onChange={(v) => update("preferredFoods", v)}
            />
            <ChipInput
              label="Foods to avoid"
              hint={`Anything whose name contains a word here is left out: "egg" removes eggs and egg whites.`}
              values={form.avoidFoods}
              error={errors.avoidFoods}
              onChange={(v) => update("avoidFoods", v)}
            />
          </>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-10">
        {step > 0 ? (
          <Button variant="secondary" onClick={() => goTo(step - 1)}>
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={busy}>
          {step < TOTAL - 1 ? "Next" : busy ? "Making your plan…" : "Make my plan"}
        </Button>
      </div>
    </form>
  );
}
