"use client";

import { ButtonLink } from "@/components/ui/button";
import { usePreviewPlan } from "@/lib/plan-store";
import { PlanView } from "./plan-view";

export function PreviewClient() {
  const plan = usePreviewPlan();

  if (plan === undefined) return <div className="flex-1" aria-busy="true" />;

  if (plan === null) {
    return (
      <div className="mx-auto w-full max-w-[560px] px-4 pt-16">
        <h1 className="text-lg font-medium">No plan to show yet</h1>
        <p className="mt-2 text-muted">Answer a few questions and your plan appears here.</p>
        <ButtonLink href="/plan/new" className="mt-6">
          Make my plan
        </ButtonLink>
      </div>
    );
  }

  return <PlanView input={plan.input} report={plan.report} />;
}
