import type { Metadata } from "next";
import { SiteHeader } from "@/components/ui/site-header";
import { WizardShell } from "@/components/wizard/wizard-shell";

export const metadata: Metadata = { title: "Make my plan" };

export default function NewPlanPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-4 pt-2 pb-10">
        <WizardShell />
      </main>
    </>
  );
}
