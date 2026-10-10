import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PlanView } from "@/components/results/plan-view";
import { ButtonLink } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/page-loading";
import { SiteHeader } from "@/components/ui/site-header";
import { formatDate } from "@/lib/dates";
import { getSharedPlan } from "@/lib/plans";

export const metadata: Metadata = { title: "Shared plan", robots: { index: false, follow: false } };

async function Shared({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const plan = await getSharedPlan(token);
  if (!plan) notFound();

  return (
    <>
      <div className="mx-auto w-full max-w-3xl px-4 pt-2 sm:px-6">
        <p className="text-sm text-muted">
          Shared plan · {plan.title} · {formatDate(plan.createdAt)}
        </p>
      </div>
      <PlanView
        input={plan.input}
        report={plan.report}
        actions={
          <ButtonLink href="/plan/new" variant="secondary">
            Make my own plan
          </ButtonLink>
        }
      />
    </>
  );
}

export default function SharedPlanPage({ params }: PageProps<"/s/[token]">) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <Suspense fallback={<PageLoading label="Loading the shared plan…" />}>
          <Shared params={params} />
        </Suspense>
      </main>
    </>
  );
}
