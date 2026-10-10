"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deletePlan, savePlan, type SaveResult } from "@/lib/plans";

export async function savePlanAction(input: unknown): Promise<SaveResult> {
  const result = await savePlan(input);
  if (result.ok) revalidatePath("/plans");
  return result;
}

export async function deletePlanAction(formData: FormData) {
  await deletePlan(String(formData.get("id") ?? ""));
  revalidatePath("/plans");
  redirect("/plans");
}
