// Pure cost math: no database, no React. That makes it easy to unit test.

import { sumOrNull } from "./numbers";
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

/** Just the parts of a food that cost needs. */
type Priced = { price: number; package_size: number };

/**
 * Cost of one serving of a recipe = cost of everything in it / servings.
 * Oats $0.74 + milk $0.30 + banana $0.25, 1 serving -> $1.29.
 *
 * One ingredient without a price makes the whole thing null ("—"), never
 * a cheaper number that leaves it out. An empty recipe is null too.
 */
export function costPerServing(
  ingredients: { food: Priced; amount: number }[],
  servings: number,
): number | null {
  if (!Number.isFinite(servings) || servings <= 0) return null;
  const total = sumOrNull(
    ingredients.map((i) => costOfAmount(i.food.price, i.food.package_size, i.amount)),
  );
  return total === null ? null : total / servings;
}

/**
 * Protein per $ = protein_g / cost: grams of protein you get for $1.
 * 24 g protein for $1.12 -> about 21 g per $.
 *
 * Hidden (null) when either is unknown, and when the cost is $0: dividing
 * by 0 would claim "infinite protein per dollar".
 */
export function proteinPerDollar(protein: number | null, cost: number | null): number | null {
  if (protein === null || cost === null) return null;
  if (!Number.isFinite(protein) || !Number.isFinite(cost) || cost <= 0) return null;
  return protein / cost;
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
