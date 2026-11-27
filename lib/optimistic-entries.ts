// Today shows a save the moment you tap, not after the server answers
// (the Doherty threshold: under 400 ms feels instant; a phone's round trip
// is often a second). These build the entry exactly as the server will
// save it, so when the server's own copy arrives nothing on screen moves.
// The server actions use the same builders, so the two can't drift apart.
// Pure, so it can be unit tested.

import type { SwappedFrom } from "./entry-validation";
import { withHeld, type Held } from "./held-entries";
import type { Meal } from "./meals";
import { NUTRIENT_KEYS, type Nutrients } from "./macros";
import { recipeSnapshotFor, scaleSnapshot, snapshotFor } from "./nutrition";
import type { Food, FormState, MealEntry, Recipe } from "./types";

/** What a log or edit sheet hands Today once it passes the checks. */
export type Typed = {
  /** The amount box as you typed it ("1,5"), sent so the server checks the same text. */
  text: string;
  amount: number;
  meal: Meal;
};

/**
 * A save that failed after its sheet closed: the sheet opens again with
 * what you typed and the server's answer (its message or box errors).
 * `key`: new for every failure, so the form is built afresh. `id`: a log's
 * entry id, kept so trying again can't log it twice.
 */
export type Draft = { key: number; amount: string; meal: Meal; state: FormState; id?: string };

/** A food you just logged. `id` is made in the phone and sent along, so it's the same row. */
export function loggedFood(id: string, day: string, meal: Meal, food: Food, amount: number): MealEntry {
  return { id, day, meal, food_id: food.id, recipe_id: null, ...snapshotFor(food, amount) };
}

/** Servings of a recipe you just logged. */
export function loggedRecipe(id: string, day: string, meal: Meal, recipe: Recipe, servings: number): MealEntry {
  return { id, day, meal, food_id: null, recipe_id: recipe.id, ...recipeSnapshotFor(recipe, servings) };
}

/** What editing changes: meal, amount, and the entry's own snapshot scaled (never re-read). */
export function editedFields(entry: MealEntry, meal: Meal, amount: number) {
  return { meal, amount, ...scaleSnapshot(entry, entry.amount, amount) };
}

/** What a swap changes: the recipe and a fresh snapshot for the same servings. */
export function swappedFields(entry: Pick<MealEntry, "amount">, recipe: Recipe) {
  return { recipe_id: recipe.id, food_id: null, ...recipeSnapshotFor(recipe, entry.amount) };
}

/** What Undo of a swap puts back: the old copy as it was (meal and servings never changed). */
export function unswappedFields(previous: SwappedFrom) {
  const nutrients = {} as Nutrients;
  for (const key of NUTRIENT_KEYS) nutrients[key] = previous[key];
  return {
    recipe_id: previous.recipe_id,
    food_id: null,
    name: previous.name,
    unit: "serving" as const,
    ...nutrients,
    cost: previous.cost,
    water_ml: previous.water_ml,
  };
}

/**
 * One change shown before the server has it:
 * - add: a new entry (last, like the newest in the server's list), or a
 *   deleted one coming back (`spot`: where it was, see held-entries.ts);
 * - change: new values for an entry that's already there.
 */
export type EntryChange =
  | { kind: "add"; entry: MealEntry; spot?: Held }
  | { kind: "change"; id: string; fields: Partial<MealEntry> };

/** The day's list with one change applied. Used as React's useOptimistic reducer. */
export function applyEntryChange(list: readonly MealEntry[], change: EntryChange): MealEntry[] {
  if (change.kind === "add") {
    // Already there: the server's copy arrived first.
    if (list.some((e) => e.id === change.entry.id)) return [...list];
    if (change.spot) return withHeld(list, [{ ...change.spot, entry: change.entry }]);
    return [...list, change.entry];
  }
  return list.map((e) => (e.id === change.id ? { ...e, ...change.fields } : e));
}
