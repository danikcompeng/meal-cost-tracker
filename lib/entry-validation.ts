// Checks a log entry from the form. Pure, so it can be unit tested.

import { isLoggableDay } from "./dates";
import { isMeal, type Meal } from "./meals";
import { AMBIGUOUS_COMMA, parseDecimal } from "./numbers";
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
