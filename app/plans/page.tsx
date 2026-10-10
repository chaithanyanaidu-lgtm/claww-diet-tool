import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOutAction } from "@/app/actions/auth";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { SiteHeader } from "@/components/ui/site-header";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { listPlans } from "@/lib/plans";

export const metadata: Metadata = { title: "My plans" };

async function PlanList() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/plans");
  const plans = await listPlans();

  return (
    <>
      {plans.length === 0 ? (
        <div className="mt-8 rounded-[20px] border border-line bg-surface p-6">
          <p className="font-medium">No saved plans yet</p>
          <p className="mt-1 text-sm text-muted">Make a plan, then choose Save plan to keep it here.</p>
          <ButtonLink href="/plan/new" className="mt-5">
            Make my plan
          </ButtonLink>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-line rounded-[20px] border border-line bg-surface">
          {plans.map((p) => (
            <li key={p.id}>
              <Link
                href={`/plan/${p.id}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors first:rounded-t-[20px] last:rounded-b-[20px] hover:bg-bg"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.title}</span>
                  <span className="block text-sm text-muted">Saved {formatDate(p.createdAt)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6 text-sm text-muted">
        <span className="min-w-0 truncate">Signed in as {user.email}</span>
        <form action={signOutAction} className="ml-auto">
          <button type="submit" className={buttonClass("secondary")}>
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}

export default function PlansPage() {
  return (
    <>
      <SiteHeader>
        <ButtonLink href="/plan/new" variant="quiet">
          New plan
        </ButtonLink>
      </SiteHeader>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-16 sm:px-6">
        <h1 className="text-xl font-medium tracking-tight">My plans</h1>
        <Suspense
          fallback={
            <div className="mt-8 h-40 animate-pulse rounded-[20px] border border-line bg-surface motion-reduce:animate-none" aria-busy="true">
              <p role="status" className="sr-only">
                Loading your plans…
              </p>
            </div>
          }
        >
          <PlanList />
        </Suspense>
      </main>
    </>
  );
}
