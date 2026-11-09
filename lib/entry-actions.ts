"use server";
// Logging, changing and deleting what you ate. Runs on the server.
// Each action is wrapped in guarded(), so a lost connection or expired
// login shows a message in the sheet instead of replacing the screen.

import { revalidatePath } from "next/cache";
import { getEntry } from "./entries";
import { validateEntryChange, validateNewEntry } from "./entry-validation";
import { getFood } from "./foods";
import { scaleSnapshot, snapshotFor } from "./nutrition";
import { guarded, logDbError, requireUser, userToday } from "./server-helpers";
import type { FormState } from "./types";

export async function logFood(_prev: FormState, formData: FormData): Promise<FormState> {
  return guarded("logFood", "Couldn't log it. Please try again.", async () => {
    const supabase = await requireUser();

    const result = validateNewEntry(
      {
        foodId: formData.get("foodId"),
        day: formData.get("day"),
        meal: formData.get("meal"),
        amount: formData.get("amount"),
      },
      await userToday(),
    );
    if (!result.ok) return { ok: false, fieldErrors: result.fieldErrors };
    const { food_id, day, meal, amount } = result.value;

    // The snapshot is worked out here from the saved food, never from
    // numbers the browser sends, so nobody can log made-up macros or prices.
    const food = await getFood(food_id);
    if (!food) return { ok: false, message: "That food doesn't exist anymore." };

    const { error } = await supabase.from("meal_entries").insert({
      food_id,
      day,
      meal,
      status: "eaten",
      ...snapshotFor(food, amount),
    });
    if (error) {
      logDbError("logFood", error);
      return { ok: false, message: "Couldn't log it. Please try again." };
    }

    revalidatePath("/");
    return { ok: true };
  });
}

export async function updateEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  return guarded("updateEntry", "Couldn't save. Please try again.", async () => {
    const supabase = await requireUser();

    const id = formData.get("id");
    if (typeof id !== "string" || !id) return { ok: false, message: "Missing entry." };

    const result = validateEntryChange({
      meal: formData.get("meal"),
      amount: formData.get("amount"),
    });
    if (!result.ok) return { ok: false, fieldErrors: result.fieldErrors };

    const entry = await getEntry(id);
    if (!entry) return { ok: false, message: "That entry doesn't exist anymore." };

    // Scale the entry's own snapshot; the food may have changed since.
    // Only meal, amount and the snapshot change: never the day or food.
    const { meal, amount } = result.value;
    const { error } = await supabase
      .from("meal_entries")
      .update({ meal, amount, ...scaleSnapshot(entry, entry.amount, amount) })
      .eq("id", id);
    if (error) {
      logDbError("updateEntry", error);
      return { ok: false, message: "Couldn't save. Please try again." };
    }

    revalidatePath("/");
    return { ok: true };
  });
}

export async function deleteEntry(id: string): Promise<FormState> {
  return guarded("deleteEntry", "Couldn't delete. Please try again.", async () => {
    const supabase = await requireUser();
    const { error } = await supabase.from("meal_entries").delete().eq("id", id);
    if (error) {
      logDbError("deleteEntry", error);
      return { ok: false, message: "Couldn't delete. Please try again." };
    }

    revalidatePath("/");
    return { ok: true };
  });
}
