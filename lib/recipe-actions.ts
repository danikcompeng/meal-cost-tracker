"use server";
// Creating, changing and deleting recipes and their ingredients. Runs on
// the server. Each action is wrapped in guarded(), so a lost connection
// shows a message in the sheet instead of replacing the screen.
//
// Row Level Security does the real protecting: Postgres refuses to show
// or change a recipe that isn't yours, and refuses an ingredient unless
// both the recipe AND the food are yours (migration 011).

import { revalidatePath } from "next/cache";
import { validateIngredient, validateRecipe } from "./recipe-validation";
import { guarded, logDbError, requireUser } from "./server-helpers";
import type { FormState } from "./types";

// Postgres error code for "this points at a row that doesn't exist":
// here, adding a food that was deleted a moment ago in another tab.
const FOREIGN_KEY_VIOLATION = "23503";

export async function createRecipe(_prev: FormState, formData: FormData): Promise<FormState> {
  return guarded("createRecipe", "Couldn't create it. Please try again.", async () => {
    const supabase = await requireUser();
    const result = validateRecipe({ name: formData.get("name"), servings: formData.get("servings") });
    if (!result.ok) return { ok: false, fieldErrors: result.fieldErrors };

    const { data, error } = await supabase.from("recipes").insert(result.value).select("id").single();
    if (error) {
      logDbError("createRecipe", error);
      return { ok: false, message: "Couldn't create it. Please try again." };
    }
    refresh();
    // The id, so the sheet can open the new recipe to add ingredients.
    return { ok: true, id: data.id };
  });
}

export async function updateRecipe(_prev: FormState, formData: FormData): Promise<FormState> {
  return guarded("updateRecipe", "Couldn't save. Please try again.", async () => {
    const supabase = await requireUser();
    const id = formData.get("id");
    if (typeof id !== "string" || !id) return { ok: false, message: "Missing recipe." };

    const result = validateRecipe({ name: formData.get("name"), servings: formData.get("servings") });
    if (!result.ok) return { ok: false, fieldErrors: result.fieldErrors };

    // .select() returns the rows that changed. None = not yours or gone.
    const { data, error } = await supabase.from("recipes").update(result.value).eq("id", id).select("id");
    if (error) {
      logDbError("updateRecipe", error);
      return { ok: false, message: "Couldn't save. Please try again." };
    }
    if (data.length === 0) return { ok: false, message: "That recipe doesn't exist anymore." };
    refresh();
    return { ok: true };
  });
}

/** Days you logged it keep their numbers: those are copies (snapshots). */
export async function deleteRecipe(id: string): Promise<FormState> {
  return guarded("deleteRecipe", "Couldn't delete. Please try again.", async () => {
    const supabase = await requireUser();
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (error) {
      logDbError("deleteRecipe", error);
      return { ok: false, message: "Couldn't delete. Please try again." };
    }
    refresh();
    return { ok: true };
  });
}

/**
 * Adds a food to a recipe, or changes how much of it there is. Each food
 * is in a recipe once, so this is an "upsert": insert, or if that food is
 * already there, update its amount.
 */
export async function saveIngredient(_prev: FormState, formData: FormData): Promise<FormState> {
  return guarded("saveIngredient", "Couldn't save. Please try again.", async () => {
    const supabase = await requireUser();
    const recipeId = formData.get("recipeId");
    if (typeof recipeId !== "string" || !recipeId) return { ok: false, message: "Missing recipe." };

    const result = validateIngredient({ foodId: formData.get("foodId"), amount: formData.get("amount") });
    if (!result.ok) return { ok: false, fieldErrors: result.fieldErrors };

    const { error } = await supabase
      .from("recipe_ingredients")
      .upsert({ recipe_id: recipeId, ...result.value }, { onConflict: "recipe_id,food_id" });
    if (error) {
      if (error.code === FOREIGN_KEY_VIOLATION) {
        return { ok: false, message: "That food or recipe doesn't exist anymore." };
      }
      logDbError("saveIngredient", error);
      return { ok: false, message: "Couldn't save. Please try again." };
    }
    refresh();
    return { ok: true };
  });
}

export async function removeIngredient(recipeId: string, foodId: string): Promise<FormState> {
  return guarded("removeIngredient", "Couldn't remove it. Please try again.", async () => {
    const supabase = await requireUser();
    const { error } = await supabase
      .from("recipe_ingredients")
      .delete()
      .eq("recipe_id", recipeId)
      .eq("food_id", foodId);
    if (error) {
      logDbError("removeIngredient", error);
      return { ok: false, message: "Couldn't remove it. Please try again." };
    }
    refresh();
    return { ok: true };
  });
}

// "layout" refreshes /recipes and every /recipes/[id] page under it.
// Today too: its "Add to lunch" list offers your recipes.
function refresh() {
  revalidatePath("/recipes", "layout");
  revalidatePath("/");
}
