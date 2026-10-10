"use client";

import { useActionState, useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction, signUpAction, type AuthState } from "@/app/actions/auth";
import { buttonClass } from "@/components/ui/button";

type Mode = "signin" | "signup";

function TextField({ label, error, ...props }: { label: string; error?: boolean } & React.ComponentProps<"input">) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        required
        aria-invalid={error || undefined}
        className={`mt-1.5 h-12 w-full rounded-[14px] border bg-surface px-4 text-base outline-none focus-visible:border-accent ${
          error ? "border-danger" : "border-line"
        }`}
        {...props}
      />
    </div>
  );
}

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const [mode, setMode] = useState<Mode>("signin");
  const [signInState, signIn, signingIn] = useActionState<AuthState, FormData>(signInAction, undefined);
  const [signUpState, signUp, signingUp] = useActionState<AuthState, FormData>(signUpAction, undefined);

  const state = mode === "signin" ? signInState : signUpState;
  const pending = signingIn || signingUp;
  const linkError = params.get("error") === "link" && !state;
  const errorId = useId();

  return (
    <div>
      <div role="group" aria-label="Account" className="flex gap-1 rounded-full border border-line bg-surface p-1">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-10 flex-1 rounded-full text-sm font-medium transition-colors ${
              mode === m ? "bg-accent text-on-accent" : "text-muted hover:text-ink"
            }`}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      {state?.notice ? (
        <div role="status" className="mt-6 rounded-[14px] border border-line bg-surface p-4 text-sm">
          <p className="font-medium">Check your email</p>
          <p className="mt-1 text-muted">{state.notice}</p>
        </div>
      ) : (
        <form
          key={mode}
          action={mode === "signin" ? signIn : signUp}
          className="mt-6 space-y-4"
          aria-describedby={state?.error || linkError ? errorId : undefined}
        >
          <input type="hidden" name="next" value={next} />
          <TextField label="Email" name="email" type="email" autoComplete="email" defaultValue={state?.email} error={!!state?.error} />
          <TextField
            label="Password"
            name="password"
            type="password"
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            error={!!state?.error}
          />
          {mode === "signup" && <p className="-mt-2 text-xs text-muted">At least 8 characters.</p>}
          {(state?.error || linkError) && (
            <p id={errorId} role="alert" className="text-sm text-danger">
              {state?.error ?? "That confirmation link didn't work. It may have expired or been opened in another browser. Sign in, or create your account again."}
            </p>
          )}
          <button type="submit" disabled={pending} className={buttonClass("primary", "w-full")}>
            {pending ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
      )}
    </div>
  );
}
