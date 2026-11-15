import "server-only";
import { toFood } from "./foods";
import { isUuid } from "./ids";
import { createClient } from "./supabase/server";
import type { Recipe } from "./types";

// Reads only. Row Level Security limits these to the logged-in user's
// recipes, and an ingredient row is only visible if you own its recipe.

// One string, not "a" + "b": Supabase reads this text to know the row's
// shape. "food:foods(...)" fetches each ingredient's food in the same
// request (Supabase follows the food_id reference), named "food".
const RECIPE_COLUMNS =
  "id, name, servings, recipe_ingredients(amount, created_at, food:foods(id, name, brand, barcode, price, package_size, unit, kcal, protein_g, carbs_g, fat_g, sugar_g, fiber_g, saturated_fat_g, sodium_mg, counts_toward_hydration))";

/** All your recipes with their ingredients, A to Z. */
export async function getRecipes(): Promise<Recipe[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_COLUMNS)
    .order("name", { ascending: true });
  if (error) throw new Error(`Couldn't load recipes: ${error.message}`);
  return (data ?? []).map((row) => toRecipe(row as Record<string, unknown>));
}

/** One of your recipes, or null if it doesn't exist or isn't yours. */
export async function getRecipe(id: string): Promise<Recipe | null> {
  // A typo in the address isn't a uuid: "this recipe doesn't exist".
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load the recipe: ${error.message}`);
  return data ? toRecipe(data as Record<string, unknown>) : null;
}

/** Names of your recipes that use this food, A to Z (empty if none). */
export async function recipeNamesUsingFood(foodId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipe_ingredients")
    .select("recipe:recipes(name)")
    .eq("food_id", foodId);
  if (error) throw new Error(`Couldn't check recipes: ${error.message}`);
  // Supabase can't see our tables' shape, so it guesses "recipe" is a
  // list. Each ingredient row belongs to ONE recipe, so the server sends
  // one object (or null); "as unknown as" says we know better here.
  return (data ?? [])
    .map((row) => (row as unknown as { recipe: { name: string } | null }).recipe?.name)
    .filter((name): name is string => typeof name === "string")
    .sort((a, b) => a.localeCompare(b));
}

type IngredientRow = { amount: unknown; created_at: string; food: Record<string, unknown> | null };

// Postgres "numeric" can arrive as a string, so convert.
function toRecipe(row: Record<string, unknown>): Recipe {
  const rows = (row.recipe_ingredients ?? []) as IngredientRow[];
  return {
    id: row.id as string,
    name: row.name as string,
    servings: Number(row.servings),
    // Oldest first, so ingredients stay in the order you added them.
    ingredients: [...rows]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((ingredient) => {
        // Can't happen: the database only lets your own foods into your
        // recipes, and refuses to delete a food that's in one. But if it
        // ever did, dropping the ingredient would show a cheaper, lighter
        // recipe than the real one, so fail loudly instead.
        if (!ingredient.food) throw new Error("A recipe ingredient's food is missing");
        return { amount: Number(ingredient.amount), food: toFood(ingredient.food) };
      }),
  };
}
