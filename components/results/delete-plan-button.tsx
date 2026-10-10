"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { deletePlanAction } from "@/app/actions/plans";
import { Button, buttonClass } from "@/components/ui/button";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass("secondary", "text-danger")}>
      {pending ? "Deleting…" : "Yes, delete it"}
    </button>
  );
}

/** Two-step delete, so a stray tap can't remove a plan. */
export function DeletePlanButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Button variant="quiet" onClick={() => setConfirming(true)}>
        Delete
      </Button>
    );
  }
  return (
    <form action={deletePlanAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <span className="text-sm text-muted">Delete this plan?</span>
      <ConfirmButton />
      <Button variant="quiet" onClick={() => setConfirming(false)}>
        Keep it
      </Button>
    </form>
  );
}
