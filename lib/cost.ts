// Pure cost math: no database, no React. That makes it easy to unit test,
// and later the recipe cost-per-serving function will live here too.

import type { BaseUnit } from "./units";

/** Price of a single unit, e.g. $3.50 for 500 g -> $0.007 per g. */
export function pricePerUnit(price: number, packageSize: number): number {
  if (packageSize <= 0) return 0;
  return price / packageSize;
}

/**
 * A human-friendly price label. "$0.007 per g" is hard to read, so grams and
 * millilitres are shown per 100 instead: "$0.70 / 100 g".
 */
export function unitPriceLabel(
  price: number,
  packageSize: number,
  unit: BaseUnit,
): string {
  const perUnit = pricePerUnit(price, packageSize);
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
  return value > 0 && value < 0.01 ? smallDollars.format(value) : dollars.format(value);
}
