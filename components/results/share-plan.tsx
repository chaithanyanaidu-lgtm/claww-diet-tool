"use client";

import { useState, useTransition } from "react";
import { setSharingAction } from "@/app/actions/plans";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/lib/plan-store";

/** Owner controls for a saved plan's read-only link. */
export function SharePlan({ id, initialToken }: { id: string; initialToken: string | null }) {
  const [token, setToken] = useState(initialToken);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // The full address needs the browser's origin, so it appears right after hydration.
  const hydrated = useHydrated();
  const url = token ? `${hydrated ? window.location.origin : ""}/s/${token}` : "";

  function toggle(enabled: boolean) {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await setSharingAction(id, enabled);
      if (result.ok) setToken(result.token);
      else setError("That didn't work. Try again in a moment.");
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("Couldn't copy. Select the link and copy it yourself.");
    }
  }

  return (
    <section aria-labelledby="share-title" className="no-print rounded-[20px] border border-line bg-surface p-4 sm:p-6">
      <h2 id="share-title" className="text-base font-medium">
        Share this plan
      </h2>
      {token ? (
        <>
          <p className="mt-1 text-sm text-muted">Anyone with this link can view the plan. They can&apos;t change it or see your other plans.</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={url}
              aria-label="Share link"
              onFocus={(e) => e.currentTarget.select()}
              className="num h-11 min-w-0 flex-1 basis-56 rounded-[14px] border border-line bg-bg px-4 text-sm outline-none focus-visible:border-accent"
            />
            <Button onClick={copy} disabled={pending}>
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button variant="quiet" onClick={() => toggle(false)} disabled={pending}>
              Stop sharing
            </Button>
          </div>
          <p aria-live="polite" className="sr-only">
            {copied ? "Link copied" : ""}
          </p>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">Create a read-only link to send to a friend or coach.</p>
          <Button variant="secondary" className="mt-4" onClick={() => toggle(true)} disabled={pending}>
            {pending ? "Creating link…" : "Create share link"}
          </Button>
        </>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
