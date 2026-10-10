"use client";

import { useHydrated } from "@/lib/plan-store";
import { Wizard } from "./wizard";

/** Renders the wizard after hydration so it can restore a saved draft from sessionStorage. */
export function WizardShell() {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="flex-1" aria-busy="true" />;
  return <Wizard />;
}
