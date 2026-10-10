"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePlanAction } from "@/app/actions/plans";
import { Button } from "@/components/ui/button";
import type { PlanInput } from "@/lib/engine";
import { setPendingSave, takePendingSave } from "@/lib/plan-store";

const RESUME = "/plan/preview?save=1";

/**
 * Saves answers as a plan. Signed out, it keeps the answers and sends the user to sign in;
 * coming back to /plan/preview?save=1 finishes the save (see ResumePendingSave).
 */
function useSavePlan() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(answers: PlanInput) {
    setError(null);
    startTransition(async () => {
      const result = await savePlanAction(answers);
      if (result.ok) {
        router.push(`/plan/${result.id}`);
      } else if (result.reason === "signin") {
        setPendingSave(answers);
        router.push(`/login?next=${encodeURIComponent(RESUME)}`);
      } else {
        setError(result.message);
      }
    });
  }

  return { save, pending, error };
}

export function SavePlanButton({ input }: { input: PlanInput }) {
  const { save, pending, error } = useSavePlan();
  return (
    <>
      <Button onClick={() => save(input)} disabled={pending}>
        {pending ? "Saving…" : "Save plan"}
      </Button>
      {error && (
        <p role="alert" className="basis-full text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}

/** Back from sign-in: saves the answers that were waiting, even in a fresh tab with no preview. */
export function ResumePendingSave() {
  const router = useRouter();
  const { save, pending, error } = useSavePlan();
  const started = useRef(false);

  useEffect(() => {
    if (started.current || new URLSearchParams(window.location.search).get("save") !== "1") return;
    started.current = true;
    const waiting = takePendingSave();
    router.replace("/plan/preview");
    if (waiting) save(waiting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!pending && !error) return null;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 sm:px-6">
      <p role={error ? "alert" : "status"} className={`rounded-[14px] border border-line bg-surface p-4 text-sm ${error ? "text-danger" : ""}`}>
        {error ?? "Saving your plan…"}
      </p>
    </div>
  );
}
