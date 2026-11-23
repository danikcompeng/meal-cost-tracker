import { parseDecimal } from "./numbers";

// Units the database stores. Every food is saved in one of these
// "base" units so recipe math never has to convert between kg and g.
export const BASE_UNITS = ["g", "ml", "each"] as const;
export type BaseUnit = (typeof BASE_UNITS)[number];

/**
 * What a log entry is measured in: a food's own unit, or servings for a
 * recipe ("1.5 servings"). Foods are never measured in servings.
 */
export type EntryUnit = BaseUnit | "serving";

// Units the form lets you type in. Bigger units get converted to a base unit.
export const INPUT_UNITS = ["g", "kg", "ml", "l", "each"] as const;
export type InputUnit = (typeof INPUT_UNITS)[number];

const CONVERSIONS: Record<InputUnit, { unit: BaseUnit; factor: number }> = {
  g: { unit: "g", factor: 1 },
  kg: { unit: "g", factor: 1000 },
  ml: { unit: "ml", factor: 1 },
  l: { unit: "ml", factor: 1000 },
  each: { unit: "each", factor: 1 },
};

/** Converts e.g. (1, "kg") into (1000, "g"). */
export function toBaseUnit(
  amount: number,
  unit: InputUnit,
): { amount: number; unit: BaseUnit } {
  const { unit: base, factor } = CONVERSIONS[unit];
  return { amount: amount * factor, unit: base };
}

/** Units you can type a package size in, for foods measured in `base`. */
export function inputUnitsFor(base: BaseUnit): InputUnit[] {
  return INPUT_UNITS.filter((u) => CONVERSIONS[u].unit === base);
}

const amountFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** "150 g", "250 ml", "1 item", "2 items", "1 serving", "1.5 servings". */
export function amountText(amount: number, unit: EntryUnit): string {
  return `${amountNumber(amount)} ${unitWord(amount, unit)}`;
}

/** An amount as typed, up to 2 decimals: "80", "1.5", "1,000". Not display-rounded (CLAUDE.md). */
export function amountNumber(amount: number): string {
  return amountFormat.format(amount);
}

/**
 * The word after a number: "serving" or "servings", "item" or "items".
 * g and ml stay as they are. null (no number yet) counts as more than one.
 *
 * It's singular when the number as SHOWN is 1, not the exact one: a saved
 * 1.004 shows as "1", and "1 servings" would look like a typo.
 */
export function unitWord(amount: number | null, unit: EntryUnit): string {
  if (unit === "g" || unit === "ml") return unit;
  const one = amount !== null && amountFormat.format(amount) === "1";
  if (unit === "each") return one ? "item" : "items";
  return one ? "serving" : "servings";
}

/**
 * The word written inside a number box, following what's typed so far:
 * "1" says "serving", "1.5" says "servings". A blank box counts as
 * `blankMeans` (the grey placeholder you see there, like "1"). A half-typed
 * "1." already counts as 1 (so typing 1.5 doesn't flicker); text that
 * isn't a number ("abc", ".", "1,000") reads as more than one.
 */
export function unitWordForTyped(typed: string, unit: EntryUnit, blankMeans?: number): string {
  const parsed = parseDecimal(typed);
  if (parsed === null) return unitWord(blankMeans ?? null, unit);
  return unitWord(typeof parsed === "number" ? parsed : null, unit);
}

export function isInputUnit(value: unknown): value is InputUnit {
  return typeof value === "string" && (INPUT_UNITS as readonly string[]).includes(value);
}
