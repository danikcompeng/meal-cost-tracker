import "server-only";
import { createClient } from "./supabase/server";
import type { Ingredient } from "./types";

// Reads only. Row Level Security in the database guarantees this returns
// just the logged-in user's rows, even though there's no "where user_id" here.
export async function getIngredients(): Promise<Ingredient[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ingredients")
    .select("id, name, price, package_size, unit")
    .order("name", { ascending: true });

  if (error) throw new Error(`Couldn't load ingredients: ${error.message}`);

  // Postgres "numeric" can arrive as a string; make sure we have numbers.
  return (data ?? []).map((row) => ({
    ...row,
    price: Number(row.price),
    package_size: Number(row.package_size),
  }));
}
