"use server";
// Everything in this file runs on the server, but the form can call it
// directly like a normal function. Next.js handles the network request.

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import { validateFood } from "./food-validation";
import type { FormState } from "./types";

// Server actions can be called by anyone who sends a POST request, not only
// through our form, so every action checks the login first.
async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) throw new Error("Not logged in");
  return supabase;
}

export async function saveFood(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await requireUser();

  const result = validateFood({
    name: formData.get("name"),
    price: formData.get("price"),
    packageSize: formData.get("packageSize"),
    unit: formData.get("unit"),
  });
  if (!result.ok) return { ok: false, fieldErrors: result.fieldErrors };

  const id = formData.get("id");
  const query =
    typeof id === "string" && id
      ? supabase.from("foods").update(result.value).eq("id", id)
      : supabase.from("foods").insert(result.value);

  const { error } = await query;
  if (error) {
    logDbError("saveFood", error);
    return { ok: false, message: "Couldn't save. Please try again." };
  }

  revalidatePath("/foods");
  return { ok: true };
}

export async function deleteFood(id: string): Promise<FormState> {
  const supabase = await requireUser();
  const { error } = await supabase.from("foods").delete().eq("id", id);
  if (error) {
    logDbError("deleteFood", error);
    return { ok: false, message: "Couldn't delete. Please try again." };
  }

  revalidatePath("/foods");
  return { ok: true };
}

// The user only sees a friendly message, so log the real reason on the
// server: the dev server terminal locally, or the function logs on Vercel.
// A vague message with nothing logged is what hid the login email bug.
function logDbError(action: string, error: PostgrestError) {
  console.error(`${action} failed:`, {
    message: error.message,
    code: error.code, // Postgres error code, e.g. 23514 = a CHECK rule failed
    details: error.details,
    hint: error.hint,
  });
}
