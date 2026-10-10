import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { SiteHeader } from "@/components/ui/site-header";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[420px] flex-1 px-4 pt-10 pb-16">
        <h1 className="text-xl font-medium tracking-tight">Save and revisit your plans</h1>
        <p className="mt-2 text-muted">Sign in to keep your plans in one place. Making a plan never needs an account.</p>
        <div className="mt-8">
          <Suspense fallback={<div className="h-64" aria-busy="true" />}>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </>
  );
}
