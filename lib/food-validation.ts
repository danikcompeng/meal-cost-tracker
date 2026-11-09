// Turns raw form text into a clean food, or a list of problems.
// Pure function, so it can be unit tested without a database.

import { isInputUnit, toBaseUnit, type BaseUnit } from "./units";

export type FoodInput = {
  name: string;
  price: number;
  package_size: number;
  unit: BaseUnit;
};

export type ValidationResult =
  | { ok: true; value: FoodInput }
  | { ok: false; fieldErrors: Record<string, string> };

export function validateFood(raw: {
  name: unknown;
  price: unknown;
  packageSize: unknown;
  unit: unknown;
}): ValidationResult {
  const fieldErrors: Record<string, string> = {};

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) fieldErrors.name = "Give it a name.";
  else if (name.length > 100) fieldErrors.name = "Keep it under 100 characters.";

  const price = toNumber(raw.price);
  if (price === null || price < 0) fieldErrors.price = "Enter a price, like 3.49.";

  const size = toNumber(raw.packageSize);
  if (size === null || size <= 0) fieldErrors.packageSize = "Enter a size above 0.";

  const unit = isInputUnit(raw.unit) ? raw.unit : null;
  if (!unit) fieldErrors.unit = "Pick a unit.";

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
    },
  };
}

// Number("") is 0 and Number("abc") is NaN, so handle both explicitly.
// Also accepts "3,49" since some keyboards type a comma.
function toNumber(value: unknown): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const n = Number(value.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
