// Calories, macros and cost for an amount of food. Pure functions.
//
// Nothing here rounds. The snapshot columns have no size limit, so the
// exact numbers are stored and only the screen rounds them. Rounding here
// would make errors GROW when an entry is edited: 1 g of rice costs
// $0.00496, rounded that's $0.0050, and scaling the rounded number up to
// 500 g gives $2.50 instead of the real $2.48.

import { costOfAmount } from "./cost";
import { basisAmount, type Macros } from "./macros";
import type { Food } from "./types";
import type { BaseUnit } from "./units";

/**
 * Nutrient amount = amount x (nutrient / basis_amount), from CLAUDE.md.
 * 150 g of oats at 13 g protein per 100 g -> 19.5 g protein.
 * A missing nutrient stays missing (null), and a real 0 stays 0.
 */
export function nutrientsForAmount(
  food: Macros & { unit: BaseUnit },
  amount: number,
): Macros {
  const basis = basisAmount(food.unit);
  const scale = (value: number | null) => (value === null ? null : (amount * value) / basis);
  return {
    kcal: scale(food.kcal),
    protein_g: scale(food.protein_g),
    carbs_g: scale(food.carbs_g),
    fat_g: scale(food.fat_g),
  };
}

/** What gets copied into a log entry: it never changes after this. */
export type Snapshot = Macros & {
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
  entry: Macros & { cost: number | null },
  oldAmount: number,
  newAmount: number,
): Macros & { cost: number | null } {
  const factor = newAmount / oldAmount;
  const scale = (value: number | null) =>
    value === null || !Number.isFinite(factor) ? null : value * factor;
  return {
    kcal: scale(entry.kcal),
    protein_g: scale(entry.protein_g),
    carbs_g: scale(entry.carbs_g),
    fat_g: scale(entry.fat_g),
    cost: scale(entry.cost),
  };
}
