// Checks a log entry from the form. Pure, so it can be unit tested.

import { isLoggableDay } from "./dates";
import { isUuid } from "./ids";
import { NUTRIENT_KEYS, type Nutrients } from "./macros";
import { isMeal, type Meal } from "./meals";
import { AMBIGUOUS_COMMA, parseDecimal } from "./numbers";
import type { MealEntry } from "./types";
import type { EntryUnit } from "./units";

export type EntryInput = { food_id: string; day: string; meal: Meal; amount: number };
/** A recipe you ate. amount = servings. */
export type RecipeEntryInput = { recipe_id: string; day: string; meal: Meal; amount: number };

export type Result<T> = { ok: true; value: T } | { ok: false; fieldErrors: Record<string, string> };

const MAX_AMOUNT = 100000; // matches the database rule
/**
 * Most servings of a recipe you can log at once. Not a database rule, just
 * a guard against typos: "15" when you meant "1.5" would log ten meals.
 */
export const MAX_SERVINGS_LOGGED = 20;

export function validateNewEntry(
  raw: { foodId: unknown; day: unknown; meal: unknown; amount: unknown },
  today: string,
): Result<EntryInput> {
  const result = validateNew(raw.foodId, "foodId", "Pick a food.", raw, today);
  if (!result.ok) return result;
  const { id, ...rest } = result.value;
  return { ok: true, value: { food_id: id, ...rest } };
}

/** Logging a recipe: the amount is servings, like 1.5. */
export function validateNewRecipeEntry(
  raw: { recipeId: unknown; day: unknown; meal: unknown; amount: unknown },
  today: string,
): Result<RecipeEntryInput> {
  const result = validateNew(raw.recipeId, "recipeId", "Pick a recipe.", raw, today, "serving");
  if (!result.ok) return result;
  const { id, ...rest } = result.value;
  return { ok: true, value: { recipe_id: id, ...rest } };
}

/** What a new food entry and a new recipe entry both need. */
function validateNew(
  idValue: unknown,
  idField: string,
  idMessage: string,
  raw: { day: unknown; meal: unknown; amount: unknown },
  today: string,
  unit?: EntryUnit,
): Result<{ id: string; day: string; meal: Meal; amount: number }> {
  const fieldErrors: Record<string, string> = {};

  const id = typeof idValue === "string" ? idValue.trim() : "";
  if (!id) fieldErrors[idField] = idMessage;

  const day = typeof raw.day === "string" ? raw.day : "";
  if (!isLoggableDay(day, today)) fieldErrors.day = "That day can't be logged.";

  const rest = validateEntryChange({ meal: raw.meal, amount: raw.amount, unit });
  if (!rest.ok) Object.assign(fieldErrors, rest.fieldErrors);

  if (!rest.ok || Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true, value: { id, day, ...rest.value } };
}

/**
 * For changing an entry you already logged: just the amount and meal.
 * Pass the entry's unit, so a recipe entry gets the servings rules.
 */
export function validateEntryChange(raw: {
  meal: unknown;
  amount: unknown;
  unit?: EntryUnit;
}): Result<{ meal: Meal; amount: number }> {
  const fieldErrors: Record<string, string> = {};

  if (!isMeal(raw.meal)) fieldErrors.meal = "Pick a meal.";

  const checked = checkAmount(raw.amount, raw.unit);
  if ("error" in checked) fieldErrors.amount = checked.error;

  if ("error" in checked || !isMeal(raw.meal) || Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, value: { meal: raw.meal, amount: checked.amount } };
}

/**
 * Checks one amount box: grams, ml, items, or servings for a recipe.
 * Gives back the amount, rounded like the database keeps it, or the
 * message to show under the box.
 */
export function checkAmount(value: unknown, unit?: EntryUnit): { amount: number } | { error: string } {
  const amount = parseAmount(value);
  if (amount === "ambiguous") return { error: AMBIGUOUS_COMMA };
  if (amount === null) {
    return { error: unit === "serving" ? "Enter servings above 0, like 1.5." : "Enter an amount above 0." };
  }
  if (unit === "serving" && amount > MAX_SERVINGS_LOGGED) {
    return { error: "That's a lot of servings. Check the number." };
  }
  if (amount > MAX_AMOUNT) return { error: "That looks too big. Check the amount." };
  return { amount };
}

/** "Tired of this?": swap this logged entry to that recipe. */
export function validateSwap(raw: {
  entryId: unknown;
  recipeId: unknown;
}): Result<{ entryId: string; recipeId: string }> {
  const fieldErrors: Record<string, string> = {};
  if (!isUuid(raw.entryId)) fieldErrors.entryId = "Missing entry.";
  if (!isUuid(raw.recipeId)) fieldErrors.recipeId = "Pick a recipe.";
  if (!isUuid(raw.entryId) || !isUuid(raw.recipeId)) return { ok: false, fieldErrors };
  return { ok: true, value: { entryId: raw.entryId, recipeId: raw.recipeId } };
}

/**
 * A recipe entry as it was before a swap: what Undo puts back. The server
 * sends it to your phone after swapping, and your phone sends it back for
 * Undo, so it has to be checked like anything else from a browser.
 */
export type SwappedFrom = Nutrients & {
  /** null when that recipe had been deleted. */
  recipe_id: string | null;
  name: string;
  meal: Meal;
  amount: number;
  cost: number | null;
  water_ml: number;
};

/** The parts of an entry that a swap changes, plus meal and servings. */
export function swappedFrom(entry: MealEntry): SwappedFrom {
  const nutrients = {} as Nutrients;
  for (const key of NUTRIENT_KEYS) nutrients[key] = entry[key];
  return {
    recipe_id: entry.recipe_id,
    name: entry.name,
    meal: entry.meal,
    amount: entry.amount,
    ...nutrients,
    cost: entry.cost,
    water_ml: entry.water_ml,
  };
}

// Messages the server sends and the browser also shows (for no signal).
// They live here because a "use server" file can only share functions.
export const SWAP_FAILED = "Couldn't swap. Please try again.";
export const UNDO_FAILED = "Couldn't undo. Please try again.";
/** "It's changed since": Undo would overwrite something newer. */
export const UNDO_CHANGED = "It's changed since the swap, so it can't be undone.";

/**
 * Checks what Undo wants to write back, against the entry as it is now.
 * - The servings and meal go through the same rules as editing an entry,
 *   and must be the entry's own: a swap changes neither, so a different
 *   one means you edited it since (or it's not this entry's old copy).
 * - Every number is a real number (not text), 0 or more. A nutrient or the
 *   cost may be unknown (null); water never is.
 * - The name fits the database rule, and the recipe is a uuid or empty.
 * The database still only lets you write your own row, with your own
 * recipe in it.
 */
export function validateUndoSwap(
  raw: unknown,
  now: { meal: Meal; amount: number },
): Result<SwappedFrom> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, fieldErrors: { entry: "Nothing to undo." } };
  }
  const r = raw as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  const name = typeof r.name === "string" ? r.name.trim() : "";
  if (name.length < 1 || name.length > 100) fieldErrors.name = "Missing name.";

  const recipeId = r.recipe_id;
  if (recipeId !== null && !isUuid(recipeId)) fieldErrors.recipe_id = "Not a recipe.";

  // Servings and meal: the entry-edit rules, then "unchanged since".
  const change =
    typeof r.amount === "number"
      ? validateEntryChange({ meal: r.meal, amount: String(r.amount), unit: "serving" })
      : null;
  if (change === null) fieldErrors.amount = "Enter servings above 0, like 1.5.";
  else if (!change.ok) Object.assign(fieldErrors, change.fieldErrors);
  else if (change.value.amount !== now.amount || change.value.meal !== now.meal) {
    fieldErrors.entry = UNDO_CHANGED;
  }

  const nutrients = {} as Nutrients;
  for (const key of NUTRIENT_KEYS) {
    const value = r[key];
    if (value === null || isAmountOrZero(value)) nutrients[key] = value;
    else fieldErrors[key] = "Not a number.";
  }
  const cost = r.cost;
  if (cost !== null && !isAmountOrZero(cost)) fieldErrors.cost = "Not a number.";
  const water = r.water_ml;
  if (!isAmountOrZero(water)) fieldErrors.water_ml = "Not a number.";

  if (Object.keys(fieldErrors).length > 0 || !change?.ok) return { ok: false, fieldErrors };
  return {
    ok: true,
    value: {
      recipe_id: recipeId as string | null,
      name,
      meal: change.value.meal,
      amount: change.value.amount,
      ...nutrients,
      cost: cost as number | null,
      water_ml: water as number,
    },
  };
}

/** A real number, 0 or more: not text, not NaN, not Infinity. */
function isAmountOrZero(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

// The database keeps 3 decimals. A tiny amount like 0.0001 would be stored
// as 0 and then refused by the database's "above 0" rule with a vague error,
// so round first and refuse it here with a clear message instead.
function parseAmount(value: unknown): number | null | "ambiguous" {
  const n = parseDecimal(value);
  if (n === "ambiguous") return n;
  if (typeof n !== "number") return null;
  const rounded = Math.round(n * 1000) / 1000;
  return rounded > 0 ? rounded : null;
}
