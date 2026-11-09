// Pure cost math: no database, no React. That makes it easy to unit test,
// and later the recipe cost-per-serving function will live here too.

import type { BaseUnit } from "./units";

/**
 * Price of a single unit, e.g. $3.50 for 500 g -> $0.007 per g.
 *
 * Returns null when it can't be calculated (package size of 0 or less, or a
 * value that isn't a real number). We don't return 0 here because 0 means
 * "free", and a wrong price that looks real is worse than a visible gap.
 */
export function pricePerUnit(price: number, packageSize: number): number | null {
  if (!Number.isFinite(price) || !Number.isFinite(packageSize)) return null;
  if (packageSize <= 0) return null;
  return price / packageSize;
}

/**
 * Cost of amount = amount x price per unit, from CLAUDE.md.
 * 150 g of a $3.50 / 500 g bag -> $1.05. Returns null when the price can't
 * be worked out, so it shows as "no price" instead of a made-up $0.
 */
export function costOfAmount(
  price: number,
  packageSize: number,
  amount: number,
): number | null {
  const perUnit = pricePerUnit(price, packageSize);
  if (perUnit === null || !Number.isFinite(amount) || amount < 0) return null;
  return amount * perUnit;
}

/**
 * A human-friendly price label. "$0.007 per g" is hard to read, so grams and
 * millilitres are shown per 100 instead: "$0.70 / 100 g".
 * Shows "—" when the price can't be calculated.
 */
export function unitPriceLabel(
  price: number,
  packageSize: number,
  unit: BaseUnit,
): string {
  const perUnit = pricePerUnit(price, packageSize);
  if (perUnit === null) return "—";
  if (unit === "each") return `${formatMoney(perUnit)} each`;
  return `${formatMoney(perUnit * 100)} / 100 ${unit}`;
}

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// Shows up to 4 decimals for tiny amounts so they don't all round to "$0.00".
const smallDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

export function formatMoney(value: number): string {
  // NaN or Infinity would otherwise show as "$NaN" or "$∞".
  if (!Number.isFinite(value)) return "—";
  return value > 0 && value < 0.01 ? smallDollars.format(value) : dollars.format(value);
}
