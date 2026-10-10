import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { DeletePlanButton } from "@/components/results/delete-plan-button";
import { PlanView } from "@/components/results/plan-view";
import { SiteHeader } from "@/components/ui/site-header";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { getPlan } from "@/lib/plans";

export const metadata: Metadata = { title: "Saved plan" };

async function SavedPlan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/plan/${id}`)}`);

  // RLS returns nothing for someone else's plan, so it looks the same as a missing one.
  const plan = await getPlan(id);
  if (!plan) notFound();

  return (
    <>
      <p className="mx-auto w-full max-w-3xl px-4 pt-2 text-sm text-muted sm:px-6">
        {plan.title} · saved {formatDate(plan.createdAt)}
      </p>
      <PlanView input={plan.input} report={plan.report} actions={<DeletePlanButton id={plan.id} />} />
    </>
  );
}

export default function SavedPlanPage({ params }: PageProps<"/plan/[id]">) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <Suspense fallback={<div className="flex-1" aria-busy="true" />}>
          <SavedPlan params={params} />
        </Suspense>
      </main>
    </>
  );
}
