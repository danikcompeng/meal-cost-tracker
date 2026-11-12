// Spotting a food you already have, and saying what saving over it would
// change. Pure functions, so they can be unit tested.

import { unitPriceLabel } from "./cost";
import type { FoodInput } from "./food-validation";
import { macroText, type Nutrients } from "./macros";
import type { BaseUnit } from "./units";

/**
 * A name or brand in one standard form for comparing: no spaces at the
 * ends, single spaces inside, lower case. "  Rolled  Oats " -> "rolled oats".
 * A blank brand (null or "") becomes "", so it only matches another blank.
 */
export function normalizeName(value: string | null): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * The food you already have with the same name AND brand, or null.
 * `foods` must be newest first: if you've already kept two, the newest
 * is the one offered for updating.
 */
export function findDuplicate<T extends { name: string; brand: string | null }>(
  foods: T[],
  input: { name: string; brand: string | null },
): T | null {
  const name = normalizeName(input.name);
  const brand = normalizeName(input.brand);
  return foods.find((f) => normalizeName(f.name) === name && normalizeName(f.brand) === brand) ?? null;
}

type Comparable = Nutrients & {
  price: number;
  package_size: number;
  unit: BaseUnit;
  counts_toward_hydration: boolean;
};

const NUTRIENT_LINES = [
  { key: "kcal", label: "Calories", unit: "kcal" },
  { key: "protein_g", label: "Protein", unit: "g" },
  { key: "carbs_g", label: "Carbs", unit: "g" },
  { key: "fat_g", label: "Fat", unit: "g" },
  { key: "sugar_g", label: "Sugar", unit: "g" },
  { key: "fiber_g", label: "Fiber", unit: "g" },
  { key: "saturated_fat_g", label: "Saturated fat", unit: "g" },
  { key: "sodium_mg", label: "Sodium", unit: "mg" },
] as const;

const valueText = (value: number | null, unit: string) =>
  value === null ? "—" : macroText(value, unit);

/**
 * What "Update existing" would change, one short line each, most useful
 * first: "Measured by g → ml", "Price $0.70 / 100 g → $0.76 / 100 g",
 * "Protein 13 g → 11 g". An empty list means the numbers are the same.
 *
 * Price is compared as the price per 100 g (or each), so a bigger bag at
 * the same rate isn't listed: it wouldn't change what anything costs.
 */
export function duplicateChanges(existing: Comparable, input: FoodInput): string[] {
  const lines: string[] = [];
  if (existing.unit !== input.unit) lines.push(`Measured by ${existing.unit} → ${input.unit}`);

  const oldPrice = unitPriceLabel(existing.price, existing.package_size, existing.unit);
  const newPrice = unitPriceLabel(input.price, input.package_size, input.unit);
  if (oldPrice !== newPrice) lines.push(`Price ${oldPrice} → ${newPrice}`);

  for (const { key, label, unit } of NUTRIENT_LINES) {
    if (existing[key] !== input[key]) {
      lines.push(`${label} ${valueText(existing[key], unit)} → ${valueText(input[key], unit)}`);
    }
  }

  if (existing.counts_toward_hydration !== input.counts_toward_hydration) {
    lines.push(
      `Counts toward hydration ${existing.counts_toward_hydration ? "on" : "off"} → ${
        input.counts_toward_hydration ? "on" : "off"
      }`,
    );
  }
  return lines;
}
