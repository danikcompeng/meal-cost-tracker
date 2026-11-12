import "server-only";
import { numberOrNull } from "./numbers";
import { createClient } from "./supabase/server";
import type { Food } from "./types";

const FOOD_COLUMNS =
  "id, name, brand, barcode, price, package_size, unit, kcal, protein_g, carbs_g, fat_g";

// Reads only. Row Level Security in the database guarantees this returns
// just the logged-in user's rows, even though there's no "where user_id" here.
export async function getFoods(): Promise<Food[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("foods")
    .select(FOOD_COLUMNS)
    .order("name", { ascending: true });

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
// Macros use numberOrNull, because Number(null) is 0.
function toFood(row: Record<string, unknown>): Food {
  return {
    ...(row as unknown as Food),
    price: Number(row.price),
    package_size: Number(row.package_size),
    kcal: numberOrNull(row.kcal),
    protein_g: numberOrNull(row.protein_g),
    carbs_g: numberOrNull(row.carbs_g),
    fat_g: numberOrNull(row.fat_g),
  };
}
