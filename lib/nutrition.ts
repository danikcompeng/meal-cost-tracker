// Calories, macros and cost for an amount of food. Pure functions.
//
// Nothing here rounds. The snapshot columns have no size limit, so the
// exact numbers are stored and only the screen rounds them. Rounding here
// would make errors GROW when an entry is edited: 1 g of rice costs
// $0.00496, rounded that's $0.0050, and scaling the rounded number up to
// 500 g gives $2.50 instead of the real $2.48.

import { costOfAmount } from "./cost";
import { basisAmount, NUTRIENT_KEYS, type Nutrients } from "./macros";
import { numberOrNull } from "./numbers";
import type { Food } from "./types";
import type { BaseUnit } from "./units";

/** Applies `fn` to every nutrient, keeping each one's own key. */
function mapNutrients(n: Nutrients, fn: (value: number | null) => number | null): Nutrients {
  const out = {} as Nutrients;
  for (const key of NUTRIENT_KEYS) out[key] = fn(n[key]);
  return out;
}

/**
 * Reads every nutrient from a database row. Postgres "numeric" can arrive
 * as a string, and Number(null) is 0, so numberOrNull keeps blanks blank.
 */
export function nutrientsFromRow(row: Record<string, unknown>): Nutrients {
  const out = {} as Nutrients;
  for (const key of NUTRIENT_KEYS) out[key] = numberOrNull(row[key]);
  return out;
}

/**
 * Nutrient amount = amount x (nutrient / basis_amount), from CLAUDE.md.
 * 150 g of oats at 13 g protein per 100 g -> 19.5 g protein.
 * A missing nutrient stays missing (null), and a real 0 stays 0.
 */
export function nutrientsForAmount(
  food: Nutrients & { unit: BaseUnit },
  amount: number,
): Nutrients {
  const basis = basisAmount(food.unit);
  return mapNutrients(food, (value) => (value === null ? null : (amount * value) / basis));
}

/** What gets copied into a log entry: it never changes after this. */
export type Snapshot = Nutrients & {
  name: string;
  unit: BaseUnit;
  amount: number;
  cost: number | null;
};

export function snapshotFor(food: Food, amount: number): Snapshot {
  return {
    name: food.name,
    unit: food.unit,
    amount,
    ...nutrientsForAmount(food, amount),
    cost: costOfAmount(food.price, food.package_size, amount),
  };
}

/**
 * Changing an entry's amount scales its own snapshot (150 g -> 300 g doubles
 * everything). It deliberately does NOT re-read the food, so editing a food
 * later can never change a past day.
 */
export function scaleSnapshot(
  entry: Nutrients & { cost: number | null },
  oldAmount: number,
  newAmount: number,
): Nutrients & { cost: number | null } {
  const factor = newAmount / oldAmount;
  const scale = (value: number | null) =>
    value === null || !Number.isFinite(factor) ? null : value * factor;
  return { ...mapNutrients(entry, scale), cost: scale(entry.cost) };
}
