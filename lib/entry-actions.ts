"use server";
// Logging, changing and deleting what you ate. Runs on the server.
// Each action is wrapped in guarded(), so a lost connection or expired
// login shows a message in the sheet instead of replacing the screen.

import { revalidatePath } from "next/cache";
import { getEntry } from "./entries";
import { validateEntryChange, validateNewEntry, validateNewRecipeEntry } from "./entry-validation";
import { getFood } from "./foods";
import { recipeSnapshotFor, scaleSnapshot, snapshotFor } from "./nutrition";
import { getRecipe } from "./recipes";
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

/**
 * Logs servings of a recipe (1.5 = one and a half servings). The snapshot
 * is one serving x servings, worked out here from the saved recipe and
 * its foods, never from numbers the browser sends. A nutrient the recipe
 * doesn't know is saved as unknown, so Today says "+ 1 food without …".
 */
export async function logRecipe(_prev: FormState, formData: FormData): Promise<FormState> {
  return guarded("logRecipe", "Couldn't log it. Please try again.", async () => {
    const supabase = await requireUser();

    const result = validateNewRecipeEntry(
      {
        recipeId: formData.get("recipeId"),
        day: formData.get("day"),
        meal: formData.get("meal"),
        amount: formData.get("amount"),
      },
      await userToday(),
    );
    if (!result.ok) return { ok: false, fieldErrors: result.fieldErrors };
    const { recipe_id, day, meal, amount } = result.value;

    const recipe = await getRecipe(recipe_id);
    if (!recipe) return { ok: false, message: "That recipe doesn't exist anymore." };
    // An empty recipe would log a meal with no numbers at all.
    if (recipe.ingredients.length === 0) {
      return { ok: false, message: "Add ingredients to this recipe first." };
    }

    const { error } = await supabase.from("meal_entries").insert({
      recipe_id,
      day,
      meal,
      status: "eaten",
      ...recipeSnapshotFor(recipe, amount),
    });
    if (error) {
      logDbError("logRecipe", error);
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

    const entry = await getEntry(id);
    if (!entry) return { ok: false, message: "That entry doesn't exist anymore." };

    // The entry's unit decides the rules: a recipe entry is in servings
    // (at most 20), a food entry in g, ml or items.
    const result = validateEntryChange({
      meal: formData.get("meal"),
      amount: formData.get("amount"),
      unit: entry.unit,
    });
    if (!result.ok) return { ok: false, fieldErrors: result.fieldErrors };

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
