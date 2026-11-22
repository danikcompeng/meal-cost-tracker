// The demo account's sample data, and the rules about it (plans/demo.md).
// The same foods, recipes, meals and targets as
// design/ui/motion/seed-demo.sql, written as data so the server can seed
// the demo as the demo user (Row Level Security, no service-role key).
//
// Everything here is pure (no database), so it can be unit tested.
// lib/demo.ts does the reading and writing.

import { addDays } from "./dates";
import type { Meal } from "./meals";
import { recipeSnapshotFor, snapshotFor } from "./nutrition";
import type { Food, Recipe } from "./types";
import type { BaseUnit } from "./units";

/** A sample food as it's inserted (user_id comes from the login). */
export type DemoFoodRow = {
  name: string;
  unit: BaseUnit;
  price: number;
  package_size: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g: number | null;
  fiber_g: number | null;
  saturated_fat_g: number | null;
  sodium_mg: number | null;
  counts_toward_hydration: boolean;
};

// Name, unit, price paid, package size, then per 100 g / ml (or per 1
// for "each"): kcal, protein, carbs, fat. Sugar, fiber, saturated fat and
// sodium are unknown, as in the SQL seed.
function food(
  name: string,
  unit: BaseUnit,
  price: number,
  package_size: number,
  [kcal, protein_g, carbs_g, fat_g]: [number, number, number, number],
): DemoFoodRow {
  return {
    name, unit, price, package_size, kcal, protein_g, carbs_g, fat_g,
    sugar_g: null, fiber_g: null, saturated_fat_g: null, sodium_mg: null,
    counts_toward_hydration: false,
  };
}

export const DEMO_FOODS: readonly DemoFoodRow[] = [
  food("Chicken thighs", "g", 8.99, 1000, [177, 24, 0, 9]),
  food("Jasmine rice", "g", 2.49, 1000, [360, 7, 79, 0.6]),
  food("Frozen broccoli", "g", 1.99, 340, [34, 2.8, 7, 0.4]),
  food("Black beans", "g", 1.19, 425, [91, 6, 16, 0.4]),
  food("Eggs", "each", 3.99, 12, [72, 6.3, 0.4, 4.8]),
  food("Rolled oats", "g", 3.49, 1000, [389, 16.9, 66, 6.9]),
  food("Greek yogurt", "g", 4.99, 907, [59, 10, 3.6, 0.4]),
  food("Banana", "each", 0.25, 1, [105, 1.3, 27, 0.4]),
  food("Canned tuna", "g", 1.29, 142, [116, 26, 0, 1]),
  // Water: 0 kcal, so the 0 kcal rule fills the other nutrients with 0
  // (sodium stays unknown), and it counts toward hydration.
  {
    ...food("Water", "ml", 0, 1000, [0, 0, 0, 0]),
    sugar_g: 0, fiber_g: 0, saturated_fat_g: 0,
    counts_toward_hydration: true,
  },
];

/** How much of each food goes into the WHOLE recipe, in its own unit. */
export const DEMO_RECIPES: readonly {
  name: string;
  servings: number;
  ingredients: readonly [food: string, amount: number][];
}[] = [
  { name: "Chicken rice bowl", servings: 4, ingredients: [["Chicken thighs", 800], ["Jasmine rice", 300], ["Frozen broccoli", 340]] },
  { name: "Egg fried rice", servings: 2, ingredients: [["Eggs", 4], ["Jasmine rice", 160], ["Frozen broccoli", 170]] },
  { name: "Beans and rice", servings: 3, ingredients: [["Black beans", 850], ["Jasmine rice", 240]] },
  { name: "Tuna rice", servings: 2, ingredients: [["Canned tuna", 284], ["Jasmine rice", 180], ["Frozen broccoli", 170]] },
  { name: "Overnight oats", servings: 1, ingredients: [["Rolled oats", 80], ["Greek yogurt", 170], ["Banana", 1]] },
];

/**
 * Meals eaten: today's breakfast, lunch and snacks, plus a little history
 * so the swap stack has "foods you've had this week" and recipes eaten
 * recently. In the order they appear within each meal.
 */
export const DEMO_ENTRIES: readonly {
  daysAgo: number;
  meal: Meal;
  /** A food from DEMO_FOODS, or a recipe from DEMO_RECIPES. */
  kind: "food" | "recipe";
  name: string;
  /** Food: in its unit. Recipe: servings. */
  amount: number;
}[] = [
  { daysAgo: 0, meal: "breakfast", kind: "recipe", name: "Overnight oats", amount: 1 },
  { daysAgo: 0, meal: "lunch", kind: "recipe", name: "Chicken rice bowl", amount: 1 },
  { daysAgo: 0, meal: "snack", kind: "food", name: "Banana", amount: 1 },
  { daysAgo: 0, meal: "snack", kind: "food", name: "Water", amount: 750 },
  { daysAgo: 1, meal: "lunch", kind: "recipe", name: "Chicken rice bowl", amount: 1 },
  { daysAgo: 1, meal: "dinner", kind: "food", name: "Frozen broccoli", amount: 170 },
  { daysAgo: 2, meal: "breakfast", kind: "food", name: "Eggs", amount: 2 },
  { daysAgo: 2, meal: "dinner", kind: "recipe", name: "Egg fried rice", amount: 1 },
  { daysAgo: 5, meal: "dinner", kind: "recipe", name: "Tuna rice", amount: 1 },
];

/** Daily targets, as in the craft preview. */
export const DEMO_TARGETS = {
  daily_kcal: 2200,
  daily_protein_g: 150,
  daily_carbs_g: 230,
  daily_fat_g: 70,
  daily_water_ml: 2000,
  show_water: true,
} as const;

/** The recipes as the app sees them, from the saved foods and recipe ids. */
export function demoRecipes(foods: Map<string, Food>, recipeIds: Map<string, string>): Recipe[] {
  return DEMO_RECIPES.map((r) => ({
    id: required(recipeIds, r.name, "recipe"),
    name: r.name,
    servings: r.servings,
    ingredients: r.ingredients.map(([name, amount]) => ({ food: required(foods, name, "food"), amount })),
  }));
}

/**
 * The recipe_ingredients rows. created_at is one second apart from
 * `start` because a recipe lists its ingredients in the order added.
 */
export function demoIngredientRows(recipes: Recipe[], start: Date) {
  let n = 0;
  return recipes.flatMap((recipe) =>
    recipe.ingredients.map(({ food, amount }) => ({
      recipe_id: recipe.id,
      food_id: food.id,
      amount,
      created_at: new Date(start.getTime() + ++n * 1000).toISOString(),
    })),
  );
}

/**
 * The meal_entries rows. The numbers (kcal, cost, water...) come from the
 * same functions the app uses when you log something, so they match what
 * logging it yourself would save.
 */
export function demoEntryRows(today: string, foods: Map<string, Food>, recipes: Recipe[], start: Date) {
  const byName = new Map(recipes.map((r) => [r.name, r]));
  return DEMO_ENTRIES.map((e, i) => {
    const base = { day: addDays(today, -e.daysAgo), meal: e.meal, status: "eaten" as const };
    // A second apart, so each meal lists them in this order.
    const created_at = new Date(start.getTime() + (i + 1) * 1000).toISOString();
    if (e.kind === "food") {
      const f = required(foods, e.name, "food");
      return { ...base, food_id: f.id, ...snapshotFor(f, e.amount), created_at };
    }
    const r = required(byName, e.name, "recipe");
    return { ...base, recipe_id: r.id, ...recipeSnapshotFor(r, e.amount), created_at };
  });
}

function required<T>(map: Map<string, T>, name: string, what: string): T {
  const value = map.get(name);
  if (value === undefined) throw new Error(`Demo seed: no ${what} named ${name}`);
  return value;
}

/** How long sample data lasts before the next demo sign-in reseeds it. */
export const RESEED_AFTER_MS = 60 * 60 * 1000;

/**
 * When the demo was last seeded, from the demo account's user metadata,
 * or null if it's missing or unreadable.
 */
export function seededAt(metadata: unknown): Date | null {
  const value = (metadata as { demo_seeded_at?: unknown } | null | undefined)?.demo_seeded_at;
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Reseed on sign-in? Yes if it was never seeded, over an hour ago, or
 * "in the future" (a clock that far off means someone set it by hand,
 * which would otherwise stop the demo ever being reset). A few minutes of
 * clock difference between servers is allowed.
 */
export function needsReseed(metadata: unknown, now: Date): boolean {
  const at = seededAt(metadata);
  if (!at) return true;
  const age = now.getTime() - at.getTime();
  return age > RESEED_AFTER_MS || age < -5 * 60 * 1000;
}

/**
 * A sample food or recipe: one the last seed made, so created at or
 * before demo_seeded_at. With no seed date, nothing counts as a sample.
 */
export function isSample(createdAt: string, metadata: unknown): boolean {
  const at = seededAt(metadata);
  const created = new Date(createdAt);
  return at !== null && !Number.isNaN(created.getTime()) && created.getTime() <= at.getTime();
}

export const SAMPLE_FOOD_MESSAGE =
  "This is one of the demo's sample foods, so it stays the same for the next person. Add your own food to try this.";
export const SAMPLE_RECIPE_MESSAGE =
  "This is one of the demo's sample recipes, so it stays the same for the next person. Make your own recipe to try this.";
