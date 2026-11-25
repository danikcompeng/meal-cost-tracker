// Item servings: "1 bagel = 80 g". A food can have one, as a shortcut for
// typing grams. It's only ever a shortcut: the food is still measured in
// g (or ml), every amount saved is still in g, and costs and nutrients
// don't change. Pure functions, unit tested (lib/servings.test.ts).
//
// Only g and ml foods have servings: an "each" food is already counted in
// items. Missing stays missing: when Open Food Facts has no serving in g
// or ml, there is none, never a guess.

import { AMBIGUOUS_COMMA, parseDecimal } from "./numbers";
import { amountNumber, amountText, type BaseUnit } from "./units";

/** One serving: what it's called ("bagel") and how much it is, in the food's unit (80). */
export type Serving = { name: string; amount: number };

/** The two database columns, both set or both empty. */
export type ServingColumns = { serving_name: string | null; serving_amount: number | null };

export const NO_SERVING: ServingColumns = { serving_name: null, serving_amount: null };

/** Longest serving name ("slice of toast", "scoop"). */
export const MAX_SERVING_NAME = 40;
/** Largest serving, in g or ml: the same loose limit as a package. */
export const MAX_SERVING_AMOUNT = 10000;

/** The quick picks next to the amount box: ½, 1 and 2 servings. */
export const SERVING_PICKS = [0.5, 1, 2] as const;

/** A food's serving, or null if it has none (or isn't measured in g / ml). */
export function servingOf(food: ServingColumns & { unit: BaseUnit }): Serving | null {
  if (food.unit === "each" || food.serving_name === null || food.serving_amount === null) return null;
  if (!(food.serving_amount > 0)) return null;
  return { name: food.serving_name, amount: food.serving_amount };
}

/**
 * The serving to offer when editing a logged entry: its food's serving
 * today, if the food still exists and is still in the entry's unit (a
 * food switched from g to ml since must not offer "80 ml" for grams).
 */
export function servingForEntry(
  entry: { food_id: string | null; unit: string },
  foods: readonly (ServingColumns & { id: string; unit: BaseUnit })[],
): Serving | null {
  const food = entry.food_id === null ? undefined : foods.find((f) => f.id === entry.food_id);
  return food && food.unit === entry.unit ? servingOf(food) : null;
}

/**
 * "bagel" → "bagels", "box" → "boxes", "patty" → "patties". With "of"
 * the word before it changes: "slice of bread" → "slices of bread".
 * Otherwise the last word: "large egg" → "large eggs".
 */
export function plural(name: string): string {
  const words = name.split(" ");
  const ofAt = words.indexOf("of");
  const i = ofAt > 0 ? ofAt - 1 : words.length - 1;
  words[i] = pluralWord(words[i]);
  return words.join(" ");
}

function pluralWord(word: string): string {
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

/** How a count of servings is written: "½", "1", "1.5", "2". */
function countText(count: number): string {
  return count === 0.5 ? "½" : amountNumber(count);
}

/** "½ bagel", "1 bagel", "2 bagels". Up to 1 is singular, like "½ cup". */
export function servingsText(count: number, serving: Serving): string {
  return `${countText(count)} ${count > 1 ? plural(serving.name) : serving.name}`;
}

/** "1 bagel = 80 g". */
export function servingRule(serving: Serving, unit: BaseUnit): string {
  return `1 ${serving.name} = ${amountText(serving.amount, unit)}`;
}

/** The example in the food form's hint, until you type your own. */
const EXAMPLE_SERVING: Serving = { name: "bagel", amount: 80 };

/**
 * The hint under the food form's Serving boxes, saying what a serving is
 * for, with what you've typed so far: "Optional. When you log it, tap
 * “1 slice” instead of typing 30 g." Each box that's still empty (or not a
 * usable amount yet) shows the example instead: "bagel", "80". The amount
 * is shown as typed (not display-rounded), in the food's unit.
 */
export function servingHint(name: string, amount: string, unit: BaseUnit): string {
  const typed = parseDecimal(amount);
  const shownName = name.trim() || EXAMPLE_SERVING.name;
  const shownAmount = typeof typed === "number" && typed > 0 ? typed : EXAMPLE_SERVING.amount;
  return `Optional. When you log it, tap “1 ${shownName}” instead of typing ${amountText(shownAmount, unit)}.`;
}

/** How much `count` servings is, in the food's unit, rounded like the amount box (2 decimals). */
export function servingAmount(count: number, serving: Serving): number {
  return Math.round(count * serving.amount * 100) / 100;
}

/**
 * How many servings `amount` is, when it's a whole or half number of them
 * (160 g of 80 g bagels → 2), or null when it isn't (100 g → null), so a
 * recipe can say "160 g · 2 bagels" without ever showing "1.25 bagels".
 */
export function servingsIn(amount: number, serving: Serving): number | null {
  const halves = (amount / serving.amount) * 2;
  const rounded = Math.round(halves);
  if (rounded < 1 || Math.abs(halves - rounded) > 0.001) return null;
  return rounded / 2;
}

// ------------------------------------------------------ "Update existing"

/**
 * What "Update existing" (saving a duplicate over a food you have) does to
 * the serving, like the barcode rule: a serving you already have is kept,
 * even if the scan says otherwise (you may have weighed yours); one is only
 * filled in where you had none. If the unit changes (g → ml), the old
 * serving meant the other unit, so the new one (or none) replaces it.
 * Returns the columns to save, or null to leave the serving alone.
 */
export function servingUpdate(
  existing: ServingColumns & { unit: BaseUnit },
  input: ServingColumns & { unit: BaseUnit },
): ServingColumns | null {
  const unitChanged = existing.unit !== input.unit;
  const hasOne = existing.serving_name !== null;
  if (!unitChanged && (hasOne || input.serving_name === null)) return null;
  return { serving_name: input.serving_name, serving_amount: input.serving_amount };
}

/** The "You already have this" line for the serving, or null if it won't change. */
export function servingChangeLine(
  existing: ServingColumns & { unit: BaseUnit },
  input: ServingColumns & { unit: BaseUnit },
): string | null {
  const next = servingUpdate(existing, input);
  if (next === null || (next.serving_name === existing.serving_name && next.serving_amount === existing.serving_amount)) {
    return null;
  }
  const text = (s: ServingColumns, unit: BaseUnit) => {
    const serving = servingOf({ ...s, unit });
    return serving ? servingRule(serving, unit) : "none";
  };
  return `Serving ${text(existing, existing.unit)} → ${text(next, input.unit)}`;
}

// ---------------------------------------------------------------- the form

export type ServingResult =
  | { ok: true; value: ServingColumns }
  | { ok: false; fieldErrors: Record<string, string> };

/**
 * The food form's "1 [name] = [amount] g" row. Both blank: no serving.
 * Half filled: say which half is missing. An "each" food never has one
 * (the row isn't shown, and anything sent is dropped).
 */
export function validateServing(raw: { name: unknown; amount: unknown }, unit: BaseUnit | null): ServingResult {
  const name = typeof raw.name === "string" ? raw.name.trim().replace(/\s+/g, " ") : "";
  const parsed = parseDecimal(raw.amount);
  if (unit === "each" || (name === "" && parsed === null)) return { ok: true, value: NO_SERVING };

  const fieldErrors: Record<string, string> = {};
  if (name === "") fieldErrors.servingName = "Name the serving, like bagel.";
  else if (name.length > MAX_SERVING_NAME) fieldErrors.servingName = `Keep it under ${MAX_SERVING_NAME} characters.`;

  const amount = typeof parsed === "number" ? Math.round(parsed * 100) / 100 : null;
  if (parsed === null) fieldErrors.servingAmount = `Enter how much one ${name || "serving"} is.`;
  else if (parsed === "ambiguous") fieldErrors.servingAmount = AMBIGUOUS_COMMA;
  else if (parsed === "invalid") fieldErrors.servingAmount = "Enter a number, like 80.";
  else if (amount === null || amount <= 0) fieldErrors.servingAmount = "Enter an amount above 0.";
  else if (amount > MAX_SERVING_AMOUNT) fieldErrors.servingAmount = "That looks too big. Check the label.";

  if (Object.keys(fieldErrors).length > 0 || amount === null) return { ok: false, fieldErrors };
  return { ok: true, value: { serving_name: name, serving_amount: amount } };
}

// ------------------------------------------------------- Open Food Facts

/**
 * Their serving, for a food measured in `unit`, or null.
 * - The weight: only a g or ml amount written in serving_size itself
 *   ("1 bagel (80 g)", "85g", "1 bottle (500 ml)"), in the food's own
 *   unit. Their serving_quantity / serving_quantity_unit fields aren't
 *   used: they're worked out by Open Food Facts, sometimes from ounces or
 *   cups, and the unit is often wrong ("0.75 cup (170 g)" comes back as
 *   170 ml, checked 2026-11-23). No g or ml on the label = no serving.
 * - The name: serving_size without its weight. "1 bagel (80 g)" → "bagel",
 *   "1 Portion (95 g)" → "portion". Just a weight ("85g"), or a count other
 *   than 1 ("2 slices (56 g)"), is a plain "serving": that's what it is,
 *   and splitting it up would be a guess.
 */
export function servingFromOpenFoodFacts(product: Record<string, unknown>, unit: "g" | "ml"): Serving | null {
  const text = typeof product.serving_size === "string" ? product.serving_size.trim() : "";
  const weight = weightInText(text);
  if (weight === null || weight.unit !== unit) return null;
  if (!(weight.amount > 0) || weight.amount > MAX_SERVING_AMOUNT) return null;
  return { name: nameFrom(text), amount: Math.round(weight.amount * 100) / 100 };
}

type Weight = { amount: number; unit: "g" | "ml" };

// The last "80 g" / "80g" / "500 ml" / "90.0g" / "1,5 g" in the text. A
// comma before exactly 3 digits ("1,000 g") is a thousands comma, and a
// serving that big is too odd to trust, so it's read as no weight.
function weightInText(text: string): Weight | null {
  const matches = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(g|ml)\b/gi)];
  const last = matches.at(-1);
  if (!last) return null;
  if (/,\d{3}$/.test(last[1])) return null;
  return { amount: Number(last[1].replace(",", ".")), unit: last[2].toLowerCase() as "g" | "ml" };
}

function nameFrom(text: string): string {
  // Without the bracketed weight, and without a weight standing alone.
  const words = text
    .replace(/\([^)]*\)/g, " ")
    .replace(/\d+(?:[.,]\d+)?\s*(g|ml)\b/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
  const one = /^1\s+(.+)$/.exec(words);
  if (!one) return "serving"; // nothing left, or "2 slices", "1/4 cup"
  const name = one[1].toLowerCase();
  // Letters only (and spaces, hyphens, apostrophes): "bagel", "slice of bread".
  if (!/^[\p{L}][\p{L}\s'-]*$/u.test(name) || name.length > MAX_SERVING_NAME) return "serving";
  return name;
}
