import "server-only";
import { z } from "zod";
import { ENGINE_VERSION, generatePlan, type PlanInput, type PlanReport } from "@/lib/engine";
import { GOAL_LABELS, fmt } from "@/lib/labels";
import { PlanInputSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

// Data access for saved plans. Every query runs as the signed-in user, so row level security
// (supabase/migrations) decides what each person can see; these functions never take a user id.

export interface PlanSummary {
  id: string;
  title: string;
  createdAt: string;
}

export interface SavedPlan {
  id: string;
  title: string;
  createdAt: string;
  input: PlanInput;
  report: PlanReport;
}

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; reason: "signin" | "invalid" | "error"; message: string };

const IdSchema = z.uuid();

export function planTitle(input: PlanInput, report: PlanReport): string {
  return `${GOAL_LABELS[input.goal]} · ${fmt.int(report.totals.cal)} kcal`;
}

/** Validates the answers, recomputes the plan here on the server and stores it for the user. */
export async function savePlan(rawInput: unknown): Promise<SaveResult> {
  const parsed = PlanInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, reason: "invalid", message: "These answers could not be read. Make the plan again, then save it." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "signin", message: "Sign in to save your plan." };

  // Never store a report sent by the browser: the engine is the only source of numbers.
  const input = parsed.data;
  const report = generatePlan(input);
  const { data, error } = await supabase
    .from("plans")
    .insert({ user_id: user.id, title: planTitle(input, report), input, report, engine_version: ENGINE_VERSION })
    .select("id")
    .single();

  if (error || !data) return { ok: false, reason: "error", message: "Your plan could not be saved. Try again in a moment." };
  return { ok: true, id: data.id as string };
}

export async function listPlans(): Promise<PlanSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select("id, title, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load plans.");
  return data.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    createdAt: r.created_at as string,
  }));
}

/** One of the user's plans, or null when it doesn't exist or belongs to someone else. */
export async function getPlan(id: string): Promise<SavedPlan | null> {
  if (!IdSchema.safeParse(id).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select("id, title, created_at, input, report, engine_version")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const input = PlanInputSchema.safeParse(data.input);
  if (!input.success) return null;
  // Plans saved by an older engine are shown as the current engine would make them.
  const report = data.engine_version === ENGINE_VERSION ? (data.report as PlanReport) : generatePlan(input.data);
  return { id: data.id as string, title: data.title as string, createdAt: data.created_at as string, input: input.data, report };
}

export async function deletePlan(id: string): Promise<boolean> {
  if (!IdSchema.safeParse(id).success) return false;
  const supabase = await createClient();
  const { error, count } = await supabase.from("plans").delete({ count: "exact" }).eq("id", id);
  return !error && count === 1;
}
