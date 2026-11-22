import "server-only";
// The shared demo account (plans/demo.md): who it is, seeding its sample
// data, and keeping the sample foods and recipes as they are.
//
// "server-only": DEMO_EMAIL and DEMO_PASSWORD must never reach a browser.
// They have no NEXT_PUBLIC_ prefix, so Next.js wouldn't put them in the
// browser's JavaScript anyway; this line also makes the build fail if a
// browser file ever imports this one.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEMO_FOODS,
  DEMO_RECIPES,
  DEMO_TARGETS,
  SAMPLE_FOOD_MESSAGE,
  SAMPLE_RECIPE_MESSAGE,
  demoEntryRows,
  demoIngredientRows,
  demoRecipes,
  isSample,
} from "./demo-seed";
import { FOOD_COLUMNS, toFood } from "./foods";
import { createClient } from "./supabase/server";
import type { Food } from "./types";

/** The demo login, or null if the env vars aren't set (no demo then). */
export function demoCredentials(): { email: string; password: string } | null {
  const email = process.env.DEMO_EMAIL?.trim();
  const password = process.env.DEMO_PASSWORD;
  return email && password ? { email, password } : null;
}

/** Is this the demo account's email? Never true when no demo is set up. */
export function isDemoEmail(email: unknown): boolean {
  const demo = process.env.DEMO_EMAIL?.trim().toLowerCase();
  return Boolean(demo) && typeof email === "string" && email.trim().toLowerCase() === demo;
}

/** Is the person logged in right now the demo account? */
export async function isDemoAccount(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return isDemoEmail(data?.claims?.email);
}

/**
 * Replaces everything in the demo account with the sample data, as the
 * demo user: `supabase` must be logged in as them, so Row Level Security
 * limits every delete and insert to the demo's own rows.
 *
 * `user` is checked first as well: wiping an account is only ever done to
 * the demo, even if a bug passed in someone else.
 *
 * Not one database transaction (Supabase's client can't do those), so a
 * failure halfway leaves part of the data. So the seed date is cleared
 * FIRST and saved again only at the end: after a failure there's no date,
 * the next demo sign-in sees "never seeded" and starts again, and the
 * half-made rows don't count as samples. (Keeping the old date would
 * leave an empty demo for up to an hour.)
 */
export async function seedDemo(
  supabase: SupabaseClient,
  user: { id: string; email?: string },
  today: string,
): Promise<void> {
  if (!isDemoEmail(user.email)) throw new Error("seedDemo: not the demo account");
  const start = new Date();

  const { error: clearError } = await supabase.auth.updateUser({
    data: { demo_seeded_at: null, demo_seeded_day: null },
  });
  if (clearError) throw new Error(`seedDemo: clear seed date: ${clearError.message}`);

  // Meals first, then recipes (their ingredients go with them), then
  // foods: the database won't delete a food that's still in a recipe.
  for (const table of ["meal_entries", "recipes", "foods"] as const) {
    const { error } = await supabase.from(table).delete().eq("user_id", user.id);
    if (error) throw new Error(`seedDemo: delete ${table}: ${error.message}`);
  }

  const { data: foodRows, error: foodError } = await supabase
    .from("foods")
    .insert(DEMO_FOODS.map((f) => ({ ...f })))
    .select(FOOD_COLUMNS);
  if (foodError) throw new Error(`seedDemo: foods: ${foodError.message}`);
  const foods = new Map<string, Food>(
    foodRows.map((row) => {
      const f = toFood(row as Record<string, unknown>);
      return [f.name, f];
    }),
  );

  const { data: recipeRows, error: recipeError } = await supabase
    .from("recipes")
    .insert(DEMO_RECIPES.map(({ name, servings }) => ({ name, servings })))
    .select("id, name, created_at");
  if (recipeError) throw new Error(`seedDemo: recipes: ${recipeError.message}`);
  const recipes = demoRecipes(foods, new Map(recipeRows.map((r) => [r.name as string, r.id as string])));

  const { error: ingredientError } = await supabase
    .from("recipe_ingredients")
    .insert(demoIngredientRows(recipes, start));
  if (ingredientError) throw new Error(`seedDemo: ingredients: ${ingredientError.message}`);

  const { error: entryError } = await supabase
    .from("meal_entries")
    .insert(demoEntryRows(today, foods, recipes, start));
  if (entryError) throw new Error(`seedDemo: meals: ${entryError.message}`);

  const { error: settingsError } = await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, ...DEMO_TARGETS, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (settingsError) throw new Error(`seedDemo: targets: ${settingsError.message}`);

  // The seed date is the newest sample row's created_at, in the
  // database's own clock: anything made after it is someone's own. The
  // recipes were inserted after the foods, so theirs is the newest.
  const newest = recipeRows
    .map((r) => r.created_at as string)
    .reduce((a, b) => (new Date(a) >= new Date(b) ? a : b));
  // Kept on the demo account itself (its user metadata), so no new table
  // or migration. Read back with getUser(), never from the login token,
  // which keeps the old value until it's renewed. The day too: "today"
  // in the sample data goes stale at midnight, however recent the seed.
  const { error: markError } = await supabase.auth.updateUser({
    data: { demo_seeded_at: newest, demo_seeded_day: today },
  });
  if (markError) throw new Error(`seedDemo: seed date: ${markError.message}`);
}

/**
 * In the demo, the sample foods and recipes stay as they are, so the next
 * person still finds the starter set working. Returns the message to
 * show, or null if this change is fine (always null outside the demo).
 *
 * Checked on the server, in each action, so it holds whatever the screen
 * shows. Someone using the demo's login token against Supabase directly
 * could still get round it; "Reset demo" puts everything back.
 */
export async function sampleRefusal(kind: "food" | "recipe", id: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!isDemoEmail(claims?.claims?.email)) return null;

  // Fresh from Supabase, not the login token: someone else's Reset may
  // have moved the seed date since this person logged in.
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const { data: row, error: rowError } = await supabase
    .from(kind === "food" ? "foods" : "recipes")
    .select("created_at")
    .eq("id", id)
    .maybeSingle();
  // Couldn't check (say Supabase was briefly busy): refuse rather than
  // let a sample be changed, and log why.
  if (authError || rowError || !auth.user) {
    console.error("sampleRefusal: couldn't check", authError ?? rowError);
    return "Couldn't check this just now. Please try again.";
  }
  // Not there (gone, or not yours): the change after this fails safely.
  if (!row) return null;
  if (!isSample(row.created_at as string, auth.user.user_metadata)) return null;
  return kind === "food" ? SAMPLE_FOOD_MESSAGE : SAMPLE_RECIPE_MESSAGE;
}
