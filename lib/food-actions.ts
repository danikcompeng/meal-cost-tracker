"use server";
// Everything in this file runs on the server, but the form can call it
// directly like a normal function. Next.js handles the network request.
// guarded() turns unexpected failures into a message for the form.

import { revalidatePath } from "next/cache";
import { validateFood } from "./food-validation";
import { guarded, logDbError, requireUser } from "./server-helpers";
import type { FormState } from "./types";

export async function saveFood(_prev: FormState, formData: FormData): Promise<FormState> {
  return guarded("saveFood", "Couldn't save. Please try again.", async () => {
    const supabase = await requireUser();

    const result = validateFood({
      name: formData.get("name"),
      price: formData.get("price"),
      packageSize: formData.get("packageSize"),
      unit: formData.get("unit"),
      kcal: formData.get("kcal"),
      protein: formData.get("protein"),
      carbs: formData.get("carbs"),
      fat: formData.get("fat"),
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

    // The Today screen's food picker shows foods too.
    revalidatePath("/foods");
    revalidatePath("/");
    return { ok: true };
  });
}

export async function deleteFood(id: string): Promise<FormState> {
  return guarded("deleteFood", "Couldn't delete. Please try again.", async () => {
    const supabase = await requireUser();
    const { error } = await supabase.from("foods").delete().eq("id", id);
    if (error) {
      logDbError("deleteFood", error);
      return { ok: false, message: "Couldn't delete. Please try again." };
    }

    revalidatePath("/foods");
    revalidatePath("/");
    return { ok: true };
  });
}
