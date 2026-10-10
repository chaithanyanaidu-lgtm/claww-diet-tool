import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { SiteHeader } from "@/components/ui/site-header";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pt-16">
        <h1 className="text-lg font-medium">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-muted">
          The link may be mistyped, or the plan was deleted or is no longer shared. Saved plans are private to the account
          that saved them unless it shares a link.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <ButtonLink href="/plans">My plans</ButtonLink>
          <ButtonLink href="/plan/new" variant="secondary">
            Make a new plan
          </ButtonLink>
        </div>
      </main>
    </>
  );
}
