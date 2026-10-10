"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; notice?: string; email?: string } | undefined;

const Credentials = z.object({
  email: z.email("Enter a valid email address.").max(254),
  password: z.string().min(8, "Use at least 8 characters for your password.").max(72, "Use at most 72 characters."),
});

// Signing in only checks the fields are filled; the length rule applies when choosing a password.
const SignInCredentials = Credentials.extend({ password: z.string().min(1, "Enter your password.").max(72) });

function read(formData: FormData, schema: typeof Credentials | typeof SignInCredentials) {
  return schema.safeParse({ email: String(formData.get("email") ?? "").trim(), password: formData.get("password") });
}

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = read(formData, SignInCredentials);
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const unconfirmed = error.code === "email_not_confirmed";
    return {
      error: unconfirmed
        ? "Confirm your email first: open the link we sent you, then sign in."
        : "That email and password don't match an account.",
      email,
    };
  }
  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = read(formData, Credentials);
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  const next = safeNext(formData.get("next"));
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    return {
      error:
        error.code === "over_email_send_rate_limit"
          ? "Too many sign-up emails were sent just now. Wait a few minutes and try again."
          : error.code === "weak_password"
            ? "Choose a stronger password."
            : "We couldn't create your account. Check the email address and try again.",
      email,
    };
  }
  // With email confirmation on there is no session yet; the emailed link finishes sign-up.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(next);
  }
  return { notice: `We sent a confirmation link to ${email}. Open it in this browser to finish signing up.`, email };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
