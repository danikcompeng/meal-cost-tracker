import "server-only";
import { addDays } from "./dates";
import { numberOrNull } from "./numbers";
import { nutrientsFromRow } from "./nutrition";
import { logDbError } from "./server-helpers";
import { createClient } from "./supabase/server";
import { HISTORY_DAYS, WEEK_DAYS, type EatenRow } from "./swap";
import type { MealEntry } from "./types";

// Reads only. Row Level Security limits these to the logged-in user's rows.

// One string, not "a" + "b": Supabase reads this text to know the row's
// shape, and a joined string is just "some string" to TypeScript.
const ENTRY_COLUMNS =
  "id, day, meal, food_id, recipe_id, name, unit, amount, kcal, protein_g, carbs_g, fat_g, sugar_g, fiber_g, saturated_fat_g, sodium_mg, cost, water_ml";

export async function getEntriesForDay(day: string): Promise<MealEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meal_entries")
    .select(ENTRY_COLUMNS)
    .eq("day", day)
    .eq("status", "eaten")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Couldn't load the day: ${error.message}`);
  return (data ?? []).map(toEntry);
}

export async function getEntry(id: string): Promise<MealEntry | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meal_entries")
    .select(ENTRY_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load the entry: ${error.message}`);
  return data ? toEntry(data) : null;
}

/** Food ids you logged lately, newest first, for the picker's order. */
export async function getRecentFoodIds(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meal_entries")
    .select("food_id")
    .not("food_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);
  // Recent order is a nicety; if it fails, the picker is just alphabetical.
  // Still log why, so a real problem doesn't hide behind the fallback.
  if (error) {
    logDbError("getRecentFoodIds", error);
    return [];
  }
  return (data ?? []).map((row) => row.food_id as string);
}

/** Recipe ids you logged lately, newest first, for the recipe list's order. */
export async function getRecentRecipeIds(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meal_entries")
    .select("recipe_id")
    .not("recipe_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);
  // Same as foods: a nicety, so on failure the list is just A to Z.
  if (error) {
    logDbError("getRecentRecipeIds", error);
    return [];
  }
  return (data ?? []).map((row) => row.recipe_id as string);
}

// Supabase sends at most 1,000 rows per request, and quietly stops there.
// (That's the "Max rows" setting in the Supabase dashboard, under API. If
// it's ever set lower, lower this too, or a cut-off can't be spotted.)
const MAX_ROWS = 1000;

/**
 * What you ate lately, for the swap: the day, and which food or recipe.
 * Planned meals don't count, only eaten ones. Two small reads:
 * - recipes over the last 60 days, for "Haven't had it in 5 days";
 * - everything over the last 7 days, for "foods you've had this week".
 * Asking for every entry over 60 days instead could pass 1,000 rows (each
 * glass of water is a row), and the cut-off days would turn into a false
 * "Not had it in 60+ days".
 *
 * null = it didn't load (or came back cut off). The swap then skips those
 * two steps instead of guessing.
 */
export async function getEatenHistory(today: string): Promise<EatenRow[] | null> {
  const supabase = await createClient();
  const eaten = (days: number) =>
    supabase
      .from("meal_entries")
      .select("day, food_id, recipe_id")
      .eq("status", "eaten")
      .gte("day", addDays(today, -(days - 1)))
      .lte("day", today)
      .limit(MAX_ROWS);

  const [recipes, week] = await Promise.all([
    eaten(HISTORY_DAYS).not("recipe_id", "is", null),
    eaten(WEEK_DAYS),
  ]);
  for (const result of [recipes, week]) {
    if (result.error) {
      logDbError("getEatenHistory", result.error);
      return null;
    }
    // Exactly the limit means there may be more we didn't get.
    if ((result.data ?? []).length >= MAX_ROWS) {
      console.error(`getEatenHistory: hit the ${MAX_ROWS}-row limit, skipping history`);
      return null;
    }
  }
  // Recipe rows from this week come back in both; that's fine, because
  // "newest day" and "foods you've had" don't change if a row repeats.
  return [...(recipes.data ?? []), ...(week.data ?? [])];
}

// Postgres "numeric" can arrive as a string, so convert (see numberOrNull).
function toEntry(row: Record<string, unknown>): MealEntry {
  return {
    ...(row as unknown as MealEntry),
    amount: Number(row.amount),
    ...nutrientsFromRow(row),
    cost: numberOrNull(row.cost),
    // Never null in the database; ?? 0 only guards a missing column.
    water_ml: numberOrNull(row.water_ml) ?? 0,
  };
}
