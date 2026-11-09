// Checks a log entry from the form. Pure, so it can be unit tested.

import { isLoggableDay } from "./dates";
import { isMeal, type Meal } from "./meals";
import { AMBIGUOUS_COMMA, parseDecimal } from "./numbers";

export type EntryInput = { food_id: string; day: string; meal: Meal; amount: number };

type Result<T> = { ok: true; value: T } | { ok: false; fieldErrors: Record<string, string> };

const MAX_AMOUNT = 100000; // matches the database rule

export function validateNewEntry(
  raw: { foodId: unknown; day: unknown; meal: unknown; amount: unknown },
  today: string,
): Result<EntryInput> {
  const fieldErrors: Record<string, string> = {};

  const foodId = typeof raw.foodId === "string" ? raw.foodId.trim() : "";
  if (!foodId) fieldErrors.foodId = "Pick a food.";

  const day = typeof raw.day === "string" ? raw.day : "";
  if (!isLoggableDay(day, today)) fieldErrors.day = "That day can't be logged.";

  const rest = validateEntryChange(raw);
  if (!rest.ok) Object.assign(fieldErrors, rest.fieldErrors);

  if (!rest.ok || Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true, value: { food_id: foodId, day, ...rest.value } };
}

/** For changing an entry you already logged: just the amount and meal. */
export function validateEntryChange(raw: {
  meal: unknown;
  amount: unknown;
}): Result<{ meal: Meal; amount: number }> {
  const fieldErrors: Record<string, string> = {};

  if (!isMeal(raw.meal)) fieldErrors.meal = "Pick a meal.";

  const amount = parseAmount(raw.amount);
  if (amount === "ambiguous") fieldErrors.amount = AMBIGUOUS_COMMA;
  else if (amount === null) fieldErrors.amount = "Enter an amount above 0.";
  else if (amount > MAX_AMOUNT) fieldErrors.amount = "That looks too big. Check the amount.";

  if (typeof amount !== "number" || !isMeal(raw.meal) || Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, value: { meal: raw.meal, amount } };
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
