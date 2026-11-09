// Turns raw form text into a clean food, or a list of problems.
// Pure function, so it can be unit tested without a database.

import { isInputUnit, toBaseUnit, type BaseUnit } from "./units";
import { fillZeroKcalMacros, zeroKcalFillsBlanks, type Macros } from "./macros";
// parseDecimal tells "left blank" (null) apart from "typed something that
// isn't a number" ("invalid"). For optional macros that difference matters:
// blank is fine, "abc" is a mistake.
import { AMBIGUOUS_COMMA, parseDecimal } from "./numbers";

export type FoodInput = Macros & {
  name: string;
  price: number;
  package_size: number;
  unit: BaseUnit;
};

export type ValidationResult =
  | { ok: true; value: FoodInput }
  | { ok: false; fieldErrors: Record<string, string> };

export type RawMacros = {
  kcal?: unknown;
  protein?: unknown;
  carbs?: unknown;
  fat?: unknown;
};

export function validateFood(
  raw: {
    name: unknown;
    price: unknown;
    packageSize: unknown;
    unit: unknown;
  } & RawMacros,
): ValidationResult {
  const fieldErrors: Record<string, string> = {};

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) fieldErrors.name = "Give it a name.";
  else if (name.length > 100) fieldErrors.name = "Keep it under 100 characters.";

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
      price: Math.round(price * 100) / 100,
      package_size: base.amount,
      unit: base.unit,
      ...macros.value,
    },
  };
}

// Loose limits that match the database, for any unit (an "each" food can
// be a whole pizza). Going over them is almost certainly a typo.
const MAX_KCAL = 10000;
const MAX_GRAMS = 1000;

/**
 * Checks calories and macros. Every one is optional: blank means null
 * ("not entered"), and "0" means a real 0. The one exception: with 0 kcal,
 * blank protein / carbs / fat become 0 (see fillZeroKcalMacros), and
 * `filledBlanks` says so, so the form can tell you before you save.
 *
 * Foods measured in grams get stricter rules, because 100 g of food can't
 * hold more than 100 g of protein, carbs and fat together, and even pure fat
 * is about 900 kcal per 100 g. These rules don't apply to ml (100 ml of honey
 * weighs about 140 g and has about 116 g of carbs) or to "each".
 */
export function validateMacros(
  raw: RawMacros,
  unit: BaseUnit | null,
): { value: Macros; fieldErrors: Record<string, string>; filledBlanks: boolean } {
  const fieldErrors: Record<string, string> = {};

  const read = (key: keyof RawMacros, max: number): number | null => {
    const parsed = parseDecimal(raw[key]);
    if (parsed === "ambiguous") {
      fieldErrors[key] = AMBIGUOUS_COMMA;
      return null;
    }
    if (parsed === "invalid" || (parsed !== null && parsed < 0)) {
      fieldErrors[key] = "Enter a number, or leave it blank.";
      return null;
    }
    if (parsed === null) return null;
    const rounded = Math.round(parsed * 10) / 10;
    if (rounded > max) fieldErrors[key] = "That looks too high. Check the label.";
    return rounded;
  };

  const typed: Macros = {
    kcal: read("kcal", MAX_KCAL),
    protein_g: read("protein", MAX_GRAMS),
    carbs_g: read("carbs", MAX_GRAMS),
    fat_g: read("fat", MAX_GRAMS),
  };
  // 0 kcal means no protein, carbs or fat, so blanks become 0 then.
  // (Not when a box has a mistake in it: that box reads as blank here.)
  const filledBlanks = Object.keys(fieldErrors).length === 0 && zeroKcalFillsBlanks(typed);
  const value = filledBlanks ? fillZeroKcalMacros(typed) : typed;

  if (unit === "g") {
    if (value.kcal !== null && value.kcal > 900 && !fieldErrors.kcal) {
      fieldErrors.kcal = "Even pure fat is about 900 kcal per 100 g.";
    }
    const grams = [
      ["protein", value.protein_g],
      ["carbs", value.carbs_g],
      ["fat", value.fat_g],
    ] as const;
    for (const [key, amount] of grams) {
      if (amount !== null && amount > 100 && !fieldErrors[key]) {
        fieldErrors[key] = "Can't be more than 100 g per 100 g.";
      }
    }
    // Round the sum too: 33.3 + 33.3 + 33.4 is 100.00000000000001 in
    // JavaScript, and that shouldn't count as "more than 100".
    const sum = grams.reduce((total, [, amount]) => total + (amount ?? 0), 0);
    if (Math.round(sum * 10) / 10 > 100) {
      fieldErrors.macros = "Protein, carbs and fat add up to more than 100 g per 100 g.";
    }
  }

  return { value, fieldErrors, filledBlanks };
}
