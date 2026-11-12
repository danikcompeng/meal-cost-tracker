import "server-only";
import { nutrientsFromRow } from "./nutrition";
import { createClient } from "./supabase/server";
import type { Food } from "./types";

// One string, not "a" + "b": Supabase reads this text to know the row's
// shape, and a joined string is just "some string" to TypeScript.
const FOOD_COLUMNS =
  "id, name, brand, barcode, price, package_size, unit, kcal, protein_g, carbs_g, fat_g, sugar_g, fiber_g, saturated_fat_g, sodium_mg, counts_toward_hydration";

// Reads only. Row Level Security in the database guarantees this returns
// just the logged-in user's rows, even though there's no "where user_id" here.
// A to Z by name, or newest first (for "you already have this" checks).
export async function getFoods({ newestFirst = false } = {}): Promise<Food[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("foods")
    .select(FOOD_COLUMNS)
    .order(newestFirst ? "created_at" : "name", { ascending: !newestFirst });

  if (error) throw new Error(`Couldn't load foods: ${error.message}`);
  return (data ?? []).map(toFood);
}

/** One of your foods, or null if it doesn't exist or isn't yours (RLS). */
export async function getFood(id: string): Promise<Food | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("foods")
    .select(FOOD_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load the food: ${error.message}`);
  return data ? toFood(data) : null;
}

// Postgres "numeric" can arrive as a string; make sure we have numbers.
// Nutrients go through nutrientsFromRow, because Number(null) is 0.
function toFood(row: Record<string, unknown>): Food {
  return {
    ...(row as unknown as Food),
    price: Number(row.price),
    package_size: Number(row.package_size),
    counts_toward_hydration: row.counts_toward_hydration === true,
    ...nutrientsFromRow(row),
  };
}
