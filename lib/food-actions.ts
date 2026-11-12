"use server";
// Everything in this file runs on the server, but the form can call it
// directly like a normal function. Next.js handles the network request.
// guarded() turns unexpected failures into a message for the form.

import { revalidatePath } from "next/cache";
import { parseSource, validateFood } from "./food-validation";
import { guarded, logDbError, requireUser } from "./server-helpers";
import type { FormState } from "./types";

// Postgres error code for "this would break a unique rule": here, saving a
// second food with a barcode you already have.
const UNIQUE_VIOLATION = "23505";

export async function saveFood(_prev: FormState, formData: FormData): Promise<FormState> {
  return guarded("saveFood", "Couldn't save. Please try again.", async () => {
    const supabase = await requireUser();

    const result = validateFood({
      name: formData.get("name"),
      brand: formData.get("brand"),
      barcode: formData.get("barcode"),
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
    const isEdit = typeof id === "string" && id !== "";
    // "Where it came from" is set once, when the food is added. Editing a
    // scanned food by hand doesn't change how it was added.
    const query = isEdit
      ? supabase.from("foods").update(result.value).eq("id", id).select("id").single()
      : supabase
          .from("foods")
          .insert({ ...result.value, source: parseSource(formData.get("source")) })
          .select("id")
          .single();

    const { data, error } = await query;
    if (error) {
      if (error.code === UNIQUE_VIOLATION && result.value.barcode) {
        // Not a failure worth a scary message: you already have it. Find
        // it, so the form can offer to log that one instead.
        const { data: existing, error: findError } = await supabase
          .from("foods")
          .select("id")
          .eq("barcode", result.value.barcode)
          .maybeSingle();
        if (findError) logDbError("saveFood (find existing)", findError);
        return {
          ok: false,
          message: "You already have a food with this barcode.",
          existingId: existing?.id,
        };
      }
      logDbError("saveFood", error);
      return { ok: false, message: "Couldn't save. Please try again." };
    }

    // The Today screen's food picker shows foods too.
    revalidatePath("/foods");
    revalidatePath("/");
    return { ok: true, id: data.id };
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
