"use server";
// Everything in this file runs on the server, but the form can call it
// directly like a normal function. Next.js handles the network request.
// guarded() turns unexpected failures into a message for the form.

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { duplicateChanges, findDuplicate } from "./food-duplicates";
import { parseSource, validateFood, type FoodInput } from "./food-validation";
import { getFoods } from "./foods";
import { guarded, logDbError, requireUser } from "./server-helpers";
import type { Food, FormState } from "./types";

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
      countsTowardHydration: formData.get("countsTowardHydration"),
      kcal: formData.get("kcal"),
      protein: formData.get("protein"),
      carbs: formData.get("carbs"),
      fat: formData.get("fat"),
      sugar: formData.get("sugar"),
      fiber: formData.get("fiber"),
      saturatedFat: formData.get("saturatedFat"),
      sodium: formData.get("sodium"),
    });
    if (!result.ok) return { ok: false, fieldErrors: result.fieldErrors };

    const value = result.value;
    const id = formData.get("id");
    const isEdit = typeof id === "string" && id !== "";
    // The answer from the "You already have this" dialog, sent by the
    // button you pressed: "update", "keep", or nothing yet.
    const choice = formData.get("duplicateChoice");

    // A NEW food with the same name and brand as one of yours: ask first,
    // before saving anything. Editing a food never asks. "Keep both"
    // skips the check and saves a second food.
    if (!isEdit && choice !== "keep") {
      // A barcode you already have keeps its own message ("Log that one"),
      // so it's checked first.
      if (value.barcode) {
        const existingId = await foodIdWithBarcode(supabase, value.barcode);
        if (existingId) return barcodeClash(existingId);
      }
      const duplicate = findDuplicate(await getFoods({ newestFirst: true }), value);
      if (duplicate && choice === "update") return updateExisting(supabase, duplicate, value);
      if (duplicate) {
        return {
          ok: false,
          duplicate: {
            id: duplicate.id,
            name: duplicate.name,
            brand: duplicate.brand,
            changes: duplicateChanges(duplicate, value),
          },
        };
      }
    }

    // "Where it came from" is set once, when the food is added. Editing a
    // scanned food by hand doesn't change how it was added.
    const query = isEdit
      ? supabase.from("foods").update(value).eq("id", id).select("id").single()
      : supabase
          .from("foods")
          .insert({ ...value, source: parseSource(formData.get("source")) })
          .select("id")
          .single();

    const { data, error } = await query;
    if (error) return saveFailed(supabase, error, value.barcode);
    return saved(data.id);
  });
}

type Supabase = Awaited<ReturnType<typeof requireUser>>;

/**
 * "Update existing": the new numbers, unit, price and hydration switch go
 * onto the food you already have. Past log entries don't change (they're
 * snapshots).
 *
 * Kept as they are:
 * - The name and brand: they matched anyway, and a scan's spelling
 *   ("ROLLED OATS") shouldn't replace yours.
 * - The barcode, if the food already has one. A food holds one barcode,
 *   so replacing it would make the 500 g and 1 kg bags push each other
 *   out on every scan. A barcode is only added to a food with none.
 * - "How it was added", like any edit.
 */
async function updateExisting(supabase: Supabase, existing: Food, value: FoodInput): Promise<FormState> {
  const changes: Partial<FoodInput> = { ...value };
  delete changes.name;
  delete changes.brand;
  delete changes.barcode;
  const barcode = value.barcode;
  if (barcode && !existing.barcode) changes.barcode = barcode;
  // Row Level Security makes sure this can only ever change YOUR food.
  const { data, error } = await supabase
    .from("foods")
    .update(changes)
    .eq("id", existing.id)
    .select("id")
    .single();
  if (error) return saveFailed(supabase, error, barcode);
  return saved(data.id);
}

function saved(id: string): FormState {
  // The Today screen's food picker shows foods too.
  revalidatePath("/foods");
  revalidatePath("/");
  return { ok: true, id };
}

async function saveFailed(
  supabase: Supabase,
  error: PostgrestError,
  barcode: string | null,
): Promise<FormState> {
  if (error.code === UNIQUE_VIOLATION && barcode) {
    // Not a failure worth a scary message: you already have it. Find it,
    // so the form can offer to log that one instead.
    return barcodeClash(await foodIdWithBarcode(supabase, barcode));
  }
  logDbError("saveFood", error);
  return { ok: false, message: "Couldn't save. Please try again." };
}

function barcodeClash(existingId: string | undefined): FormState {
  return { ok: false, message: "You already have a food with this barcode.", existingId };
}

/** The id of your food with this barcode, if you have one. */
async function foodIdWithBarcode(supabase: Supabase, barcode: string): Promise<string | undefined> {
  const { data, error } = await supabase.from("foods").select("id").eq("barcode", barcode).maybeSingle();
  if (error) logDbError("saveFood (find by barcode)", error);
  return data?.id;
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
