import type { Metadata } from "next";
import { PreviewClient } from "@/components/results/preview-client";
import { ButtonLink } from "@/components/ui/button";
import { SiteHeader } from "@/components/ui/site-header";

export const metadata: Metadata = { title: "Your plan" };

export default function PreviewPage() {
  return (
    <>
      <SiteHeader>
        <ButtonLink href="/plan/new" variant="quiet" className="no-print">
          Edit answers
        </ButtonLink>
      </SiteHeader>
      <main className="flex flex-1 flex-col">
        <PreviewClient />
      </main>
    </>
  );
}
