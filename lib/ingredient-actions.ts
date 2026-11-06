"use server";
// Everything in this file runs on the server, but the form can call it
// directly like a normal function. Next.js handles the network request.

import { revalidatePath } from "next/cache";
import { createClient } from "./supabase/server";
import { validateIngredient } from "./ingredient-validation";
import type { FormState } from "./types";

// Server actions can be called by anyone who sends a POST request, not only
// through our form, so every action checks the login first.
async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) throw new Error("Not logged in");
  return supabase;
}

export async function saveIngredient(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await requireUser();

  const result = validateIngredient({
    name: formData.get("name"),
    price: formData.get("price"),
    packageSize: formData.get("packageSize"),
    unit: formData.get("unit"),
  });
  if (!result.ok) return { ok: false, fieldErrors: result.fieldErrors };

  const id = formData.get("id");
  const query =
    typeof id === "string" && id
      ? supabase.from("ingredients").update(result.value).eq("id", id)
      : supabase.from("ingredients").insert(result.value);

  const { error } = await query;
  if (error) return { ok: false, message: "Couldn't save. Please try again." };

  revalidatePath("/ingredients");
  return { ok: true };
}

export async function deleteIngredient(id: string): Promise<FormState> {
  const supabase = await requireUser();
  const { error } = await supabase.from("ingredients").delete().eq("id", id);
  if (error) return { ok: false, message: "Couldn't delete. Please try again." };

  revalidatePath("/ingredients");
  return { ok: true };
}
