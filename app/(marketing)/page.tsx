import { ButtonLink } from "@/components/ui/button";
import { SiteHeader } from "@/components/ui/site-header";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 pb-24 sm:px-6">
        <h1 className="max-w-[18ch] text-xl font-medium">
          A day of Indian meals, weighed to your body and goal.
        </h1>
        <div className="mt-10 flex flex-col items-start gap-3">
          <ButtonLink href="/plan/new">Make my plan</ButtonLink>
          <p className="text-xs text-muted">Free. No sign-up needed to see your plan.</p>
        </div>
      </main>
    </>
  );
}
