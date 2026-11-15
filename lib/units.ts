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
  const n = amountFormat.format(amount);
  if (unit === "each") return `${n} ${amount === 1 ? "item" : "items"}`;
  if (unit === "serving") return `${n} ${amount === 1 ? "serving" : "servings"}`;
  return `${n} ${unit}`;
}

export function isInputUnit(value: unknown): value is InputUnit {
  return typeof value === "string" && (INPUT_UNITS as readonly string[]).includes(value);
}
