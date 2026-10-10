"use client";

import { useSyncExternalStore } from "react";
import { ENGINE_VERSION, generatePlan, type PlanInput, type PlanReport } from "@/lib/engine";
import { PlanInputSchema } from "@/lib/schemas";

// The unsaved plan and the wizard draft live in sessionStorage so a refresh keeps them.
const PREVIEW_KEY = "claww:preview";
const DRAFT_KEY = "claww:draft";
const EVENT = "claww:storage";

function read(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode, blocked). The in-memory flow still works.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

const noopSubscribe = () => () => {};

/** False during server render and hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

// ---- preview (unsaved result) ----

export interface PreviewPlan {
  input: PlanInput;
  report: PlanReport;
}

// Cache parsed values by their raw string so useSyncExternalStore gets stable snapshots.
let lastRaw: string | null = null;
let lastPlan: PreviewPlan | null = null;
let memoryPreview: string | null = null;

function parsePreview(raw: string | null): PreviewPlan | null {
  if (raw === lastRaw) return lastPlan;
  lastRaw = raw;
  lastPlan = null;
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as { input?: unknown; report?: PlanReport };
    const input = PlanInputSchema.safeParse(stored.input);
    if (!input.success) return null;
    // A plan made by an older engine is regenerated from its inputs.
    const report =
      stored.report?.engineVersion === ENGINE_VERSION ? stored.report : generatePlan(input.data);
    lastPlan = { input: input.data, report };
  } catch {
    lastPlan = null;
  }
  return lastPlan;
}

export function savePreview(input: PlanInput, report: PlanReport) {
  memoryPreview = JSON.stringify({ input, report });
  write(PREVIEW_KEY, memoryPreview);
}

export function usePreviewPlan(): PreviewPlan | null | undefined {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(PREVIEW_KEY) ?? memoryPreview,
    () => undefined as unknown as string,
  );
  // undefined while hydrating, null when there is no plan.
  if (raw === undefined) return undefined;
  return parsePreview(raw);
}

// ---- wizard draft ----

export type Draft = Record<string, unknown>;

export function readDraft(): Draft | null {
  const raw = read(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Draft;
  } catch {
    return null;
  }
}

export function saveDraft(draft: Draft) {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}
