// Turns raw form text into a clean food, or a list of problems.
// Pure function, so it can be unit tested without a database.

import { normalizeBarcode } from "./barcode";
import { isInputUnit, toBaseUnit, type BaseUnit } from "./units";
import { fillZeroKcalMacros, zeroKcalFillsBlanks, type Nutrients } from "./macros";
// parseDecimal tells "left blank" (null) apart from "typed something that
// isn't a number" ("invalid"). For optional macros that difference matters:
// blank is fine, "abc" is a mistake.
import { AMBIGUOUS_COMMA, parseDecimal } from "./numbers";

export type FoodInput = Nutrients & {
  name: string;
  brand: string | null;
  barcode: string | null;
  price: number;
  package_size: number;
  unit: BaseUnit;
  counts_toward_hydration: boolean;
};

/** How a food was added (the `source` column). */
export const FOOD_SOURCES = ["manual", "open_food_facts", "label_photo"] as const;
export type FoodSource = (typeof FOOD_SOURCES)[number];

/** Anything we don't recognise counts as typed in by hand. */
export function parseSource(value: unknown): FoodSource {
  return typeof value === "string" && (FOOD_SOURCES as readonly string[]).includes(value)
    ? (value as FoodSource)
    : "manual";
}

/** Which database column each form box fills. */
export const FIELD_COLUMNS = {
  kcal: "kcal",
  protein: "protein_g",
  carbs: "carbs_g",
  fat: "fat_g",
  sugar: "sugar_g",
  fiber: "fiber_g",
  saturatedFat: "saturated_fat_g",
  sodium: "sodium_mg",
} as const satisfies Record<keyof RawMacros, keyof Nutrients>;

export type ValidationResult =
  | { ok: true; value: FoodInput }
  | { ok: false; fieldErrors: Record<string, string> };

/** What the form boxes send, keyed by each box's name. */
export type RawMacros = {
  kcal?: unknown;
  protein?: unknown;
  carbs?: unknown;
  fat?: unknown;
  sugar?: unknown;
  fiber?: unknown;
  saturatedFat?: unknown;
  sodium?: unknown;
};

export function validateFood(
  raw: {
    name: unknown;
    brand?: unknown;
    barcode?: unknown;
    price: unknown;
    packageSize: unknown;
    unit: unknown;
    /** The hydration switch: "true" when on. */
    countsTowardHydration?: unknown;
  } & RawMacros,
): ValidationResult {
  const fieldErrors: Record<string, string> = {};

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) fieldErrors.name = "Give it a name.";
  else if (name.length > 100) fieldErrors.name = "Keep it under 100 characters.";

  // Brand is optional: blank means "no brand" (null), not an empty string.
  const brandText = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const brand = brandText === "" ? null : brandText;
  if (brand !== null && brand.length > 100) fieldErrors.brand = "Keep it under 100 characters.";

  // Barcode is optional too, but if there is one it must be a real one,
  // saved in the standard form so the same product can't be saved twice.
  const barcodeText = typeof raw.barcode === "string" ? raw.barcode.trim() : "";
  const barcode = barcodeText === "" ? null : normalizeBarcode(barcodeText);
  if (barcodeText !== "" && barcode === null) {
    fieldErrors.barcode = "That barcode doesn't look right. Check the numbers under the lines.";
  }

  const priceRaw = parseDecimal(raw.price);
  const price = typeof priceRaw === "number" ? priceRaw : null;
  if (priceRaw === "ambiguous") fieldErrors.price = AMBIGUOUS_COMMA;
  else if (price === null || price < 0) fieldErrors.price = "Enter a price, like 3.49.";

  const sizeRaw = parseDecimal(raw.packageSize);
  const size = typeof sizeRaw === "number" ? sizeRaw : null;
  if (sizeRaw === "ambiguous") fieldErrors.packageSize = AMBIGUOUS_COMMA;
  else if (size === null || size <= 0) fieldErrors.packageSize = "Enter a size above 0.";

  const unit = isInputUnit(raw.unit) ? raw.unit : null;
  if (!unit) fieldErrors.unit = "Pick a unit.";

  // The database keeps package sizes to 3 decimals (in g, ml or items), so
  // 0.0001 g would be saved as 0.000 and refused by its "above 0" rule,
  // showing only "Couldn't save." Catch it here with a clear message.
  // Checked after kg / l become g / ml, because that's what gets saved.
  if (size !== null && size > 0 && unit && Math.round(toBaseUnit(size, unit).amount * 1000) === 0) {
    fieldErrors.packageSize = "That's too small to save. Check the size.";
  }

  // kg and l become g and ml, so macros are always per 100 g or 100 ml.
  const baseUnit = unit ? toBaseUnit(1, unit).unit : null;
  const macros = validateMacros(raw, baseUnit);
  Object.assign(fieldErrors, macros.fieldErrors);

  if (price === null || size === null || !unit || Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const base = toBaseUnit(size, unit);
  return {
    ok: true,
    value: {
      name,
      brand,
      barcode,
      price: Math.round(price * 100) / 100,
      package_size: base.amount,
      unit: base.unit,
      // Only ml foods can count: their amount is the water. Switching a
      // food to g or each clears it (the database refuses it otherwise).
      counts_toward_hydration: base.unit === "ml" && raw.countsTowardHydration === "true",
      ...macros.value,
    },
  };
}

// Loose limits that match the database, for any unit (an "each" food can
// be a whole pizza). Going over them is almost certainly a typo.
const MAX_KCAL = 10000;
const MAX_GRAMS = 1000;
const MAX_SODIUM_MG = 100000;
// Salt is about 39.3% sodium, so even pure salt has about 39,300 mg of
// sodium per 100 g. A little room on top for label rounding.
const MAX_SODIUM_MG_PER_100G = 39400;

/**
 * Sodium is the one box where labels print thousands with a comma
 * ("1,170 mg" in ramen), and it's in whole mg, so "1,170" can't mean
 * 1.17 mg. So for sodium only, a thousands comma is read as thousands.
 * Anything else ("1,5") goes through the usual rules.
 */
function sodiumThousands(value: unknown): unknown {
  if (typeof value !== "string" || !/^\s*\d{1,3}(,\d{3})+\s*$/.test(value)) return value;
  return value.replaceAll(",", "");
}

/**
 * Checks calories and nutrients. Every one is optional: blank means null
 * ("not entered"), and "0" means a real 0. The one exception: with 0 kcal,
 * blank protein / carbs / fat / sugar / fiber / sat fat become 0 (see
 * fillZeroKcalMacros), and `filledBlanks` says so, so the form can tell
 * you before you save. Sodium is never filled in.
 *
 * Sugar is part of carbs and saturated fat is part of fat, so neither can
 * be more than its whole. Fiber isn't compared with carbs: US labels count
 * fiber inside carbs, EU labels don't, so either way can be right.
 *
 * Foods measured in grams get stricter rules, because 100 g of food can't
 * hold more than 100 g of protein, carbs and fat together, and even pure fat
 * is about 900 kcal per 100 g. These rules don't apply to ml (100 ml of honey
 * weighs about 140 g and has about 116 g of carbs) or to "each".
 */
export function validateMacros(
  raw: RawMacros,
  unit: BaseUnit | null,
): { value: Nutrients; fieldErrors: Record<string, string>; filledBlanks: boolean } {
  const fieldErrors: Record<string, string> = {};

  // Rounds to 1 / `steps`: grams to 0.1 g (steps 10), sodium to whole mg
  // (steps 1), as on labels.
  const read = (key: keyof RawMacros, max: number, steps = 10): number | null => {
    const parsed = parseDecimal(key === "sodium" ? sodiumThousands(raw.sodium) : raw[key]);
    if (parsed === "ambiguous") {
      fieldErrors[key] = AMBIGUOUS_COMMA;
      return null;
    }
    if (parsed === "invalid" || (parsed !== null && parsed < 0)) {
      fieldErrors[key] = "Enter a number, or leave it blank.";
      return null;
    }
    if (parsed === null) return null;
    const rounded = Math.round(parsed * steps) / steps;
    if (rounded > max) fieldErrors[key] = "That looks too high. Check the label.";
    return rounded;
  };

  const typed: Nutrients = {
    kcal: read("kcal", MAX_KCAL),
    protein_g: read("protein", MAX_GRAMS),
    carbs_g: read("carbs", MAX_GRAMS),
    fat_g: read("fat", MAX_GRAMS),
    sugar_g: read("sugar", MAX_GRAMS),
    fiber_g: read("fiber", MAX_GRAMS),
    saturated_fat_g: read("saturatedFat", MAX_GRAMS),
    sodium_mg: read("sodium", MAX_SODIUM_MG, 1),
  };
  // 0 kcal means no protein, carbs or fat, so blanks become 0 then.
  // (Not when a box has a mistake in it: that box reads as blank here.)
  const filledBlanks = Object.keys(fieldErrors).length === 0 && zeroKcalFillsBlanks(typed);
  const value = filledBlanks ? fillZeroKcalMacros(typed) : typed;

  const partOf = (key: keyof RawMacros, part: number | null, whole: number | null, message: string) => {
    if (part !== null && whole !== null && part > whole && !fieldErrors[key]) fieldErrors[key] = message;
  };
  partOf("sugar", value.sugar_g, value.carbs_g, "Sugar is part of carbs, so it can't be more.");
  partOf("saturatedFat", value.saturated_fat_g, value.fat_g, "Saturated fat is part of fat, so it can't be more.");

  if (unit === "g") {
    if (value.kcal !== null && value.kcal > 900 && !fieldErrors.kcal) {
      fieldErrors.kcal = "Even pure fat is about 900 kcal per 100 g.";
    }
    const grams = [
      ["protein", value.protein_g],
      ["carbs", value.carbs_g],
      ["fat", value.fat_g],
      ["sugar", value.sugar_g],
      ["fiber", value.fiber_g],
      ["saturatedFat", value.saturated_fat_g],
    ] as const;
    for (const [key, amount] of grams) {
      if (amount !== null && amount > 100 && !fieldErrors[key]) {
        fieldErrors[key] = "Can't be more than 100 g per 100 g.";
      }
    }
    if (value.sodium_mg !== null && value.sodium_mg > MAX_SODIUM_MG_PER_100G && !fieldErrors.sodium) {
      fieldErrors.sodium = "Even pure salt is about 39,300 mg per 100 g.";
    }
    // Only the main three add up: sugar and sat fat are already inside
    // carbs and fat, and fiber may be too. Round the sum: 33.3 + 33.3 +
    // 33.4 is 100.00000000000001 in JavaScript, which isn't "more than 100".
    const sum = grams.slice(0, 3).reduce((total, [, amount]) => total + (amount ?? 0), 0);
    if (Math.round(sum * 10) / 10 > 100) {
      fieldErrors.macros = "Protein, carbs and fat add up to more than 100 g per 100 g.";
    }
  }

  return { value, fieldErrors, filledBlanks };
}
