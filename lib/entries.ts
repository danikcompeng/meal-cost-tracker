import "server-only";
import { numberOrNull } from "./numbers";
import { logDbError } from "./server-helpers";
import { createClient } from "./supabase/server";
import type { MealEntry } from "./types";

// Reads only. Row Level Security limits these to the logged-in user's rows.

const ENTRY_COLUMNS =
  "id, day, meal, food_id, name, unit, amount, kcal, protein_g, carbs_g, fat_g, cost";

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

// Postgres "numeric" can arrive as a string, so convert (see numberOrNull).
function toEntry(row: Record<string, unknown>): MealEntry {
  return {
    ...(row as unknown as MealEntry),
    amount: Number(row.amount),
    kcal: numberOrNull(row.kcal),
    protein_g: numberOrNull(row.protein_g),
    carbs_g: numberOrNull(row.carbs_g),
    fat_g: numberOrNull(row.fat_g),
    cost: numberOrNull(row.cost),
  };
}
