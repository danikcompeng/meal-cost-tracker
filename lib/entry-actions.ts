"use server";
// Logging, changing and deleting what you ate. Runs on the server.
// Each action is wrapped in guarded(), so a lost connection or expired
// login shows a message in the sheet instead of replacing the screen.

import { revalidatePath } from "next/cache";
import { getEntry } from "./entries";
import {
  SWAP_FAILED,
  swappedFrom,
  UNDO_CHANGED,
  UNDO_FAILED,
  validateEntryChange,
  validateNewEntry,
  validateNewRecipeEntry,
  validateSwap,
  validateUndoSwap,
  type SwappedFrom,
} from "./entry-validation";
import { getFood } from "./foods";
import { isUuid } from "./ids";
import { nutrientsFromRow, recipeSnapshotFor, scaleSnapshot, snapshotFor } from "./nutrition";
import { getRecipe } from "./recipes";
import { guarded, logDbError, requireUser, userToday } from "./server-helpers";
import type { FormState } from "./types";

/** After a swap: the entry as it was, so Undo can put it back. */
export type SwapResult = { ok: true; previous: SwappedFrom } | { ok: false; message: string };

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

/**
 * "Tired of this?": the logged recipe entry becomes `recipeId` instead,
 * in the same meal, with the same servings and a fresh snapshot worked
 * out here from the saved recipe (never numbers from the browser).
 *
 * It's changed in place, one statement: the id, day, meal, servings and
 * created_at stay, so it keeps its spot in the meal's list. (Delete, then
 * add, would be two steps that can half fail, and it would jump to the
 * bottom of the list.)
 */
export async function swapEntry(entryId: string, recipeId: string): Promise<SwapResult> {
  return guarded("swapEntry", SWAP_FAILED, async (): Promise<SwapResult> => {
    const supabase = await requireUser();

    const ids = validateSwap({ entryId, recipeId });
    if (!ids.ok) return { ok: false, message: SWAP_FAILED };

    const entry = await getEntry(ids.value.entryId);
    if (!entry) return { ok: false, message: "That entry doesn't exist anymore." };
    // Swaps are recipe to recipe. An entry whose recipe was deleted is
    // still in servings, so it can be swapped too.
    if (entry.unit !== "serving") return { ok: false, message: "Only recipes can be swapped." };
    // Also what you see if a swap worked but the answer never reached your
    // phone, and you tried again.
    if (entry.recipe_id === ids.value.recipeId) {
      return { ok: false, message: "It's already that recipe." };
    }

    const recipe = await getRecipe(ids.value.recipeId);
    if (!recipe) return { ok: false, message: "That recipe doesn't exist anymore." };
    if (recipe.ingredients.length === 0) {
      return { ok: false, message: "That recipe has no ingredients yet." };
    }

    // Only if the entry is still exactly what was read above: same servings,
    // same recipe. An edit from another phone in the moment between the
    // read and this write would otherwise be overwritten without a word.
    const unchanged = supabase
      .from("meal_entries")
      .update({ recipe_id: recipe.id, food_id: null, ...recipeSnapshotFor(recipe, entry.amount) })
      .eq("id", entry.id)
      .eq("amount", entry.amount);
    const { data, error } = await (entry.recipe_id === null
      ? unchanged.is("recipe_id", null)
      : unchanged.eq("recipe_id", entry.recipe_id)
    )
      // Sends back the rows it changed: none means it was deleted or
      // changed a moment ago, which mustn't be mistaken for success.
      .select("id");
    if (error) {
      logDbError("swapEntry", error);
      return { ok: false, message: SWAP_FAILED };
    }
    if ((data ?? []).length === 0) return { ok: false, message: "It changed just now. Please try again." };

    revalidatePath("/");
    return { ok: true, previous: swappedFrom(entry) };
  });
}

/**
 * Undo a swap: puts back the entry's old copy. Only if the entry still
 * has the recipe you swapped to, with the same servings and meal;
 * otherwise you've changed it since, and Undo would overwrite that.
 *
 * The old copy comes back from your phone, so it's checked first
 * (validateUndoSwap). Working it out again from the old recipe instead
 * would quietly change it if you'd edited that recipe since.
 */
export async function undoSwap(
  entryId: string,
  swappedTo: string,
  previous: unknown,
): Promise<FormState> {
  return guarded("undoSwap", UNDO_FAILED, async (): Promise<FormState> => {
    const supabase = await requireUser();
    if (!isUuid(entryId) || !isUuid(swappedTo)) return { ok: false, message: UNDO_FAILED };

    const entry = await getEntry(entryId);
    if (!entry) return { ok: false, message: "That entry doesn't exist anymore." };
    if (entry.recipe_id !== swappedTo) return { ok: false, message: UNDO_CHANGED };

    const result = validateUndoSwap(previous, entry);
    if (!result.ok) {
      // A real Undo never fails these checks, so say which one did.
      console.error("undoSwap refused:", result.fieldErrors);
      return { ok: false, message: result.fieldErrors.entry ?? UNDO_FAILED };
    }
    // Meal and servings were only checked, never written: a swap didn't
    // change them, so neither does Undo.
    const old = result.value;

    const { data, error } = await supabase
      .from("meal_entries")
      .update({
        recipe_id: old.recipe_id,
        food_id: null,
        name: old.name,
        unit: "serving",
        ...nutrientsFromRow(old),
        cost: old.cost,
        water_ml: old.water_ml,
      })
      .eq("id", entryId)
      // Everything checked above, checked again at the moment of writing
      // (same recipe, servings and meal), so two quick taps or another
      // phone can't undo over a newer change.
      .eq("recipe_id", swappedTo)
      .eq("amount", old.amount)
      .eq("meal", old.meal)
      .select("id");
    if (error) {
      logDbError("undoSwap", error);
      return { ok: false, message: UNDO_FAILED };
    }
    if ((data ?? []).length === 0) return { ok: false, message: UNDO_CHANGED };

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
