// Calories, macros and cost for an amount of food. Pure functions.
//
// Nothing here rounds. The snapshot columns have no size limit, so the
// exact numbers are stored and only the screen rounds them. Rounding here
// would make errors GROW when an entry is edited: 1 g of rice costs
// $0.00496, rounded that's $0.0050, and scaling the rounded number up to
// 500 g gives $2.50 instead of the real $2.48.

import { costOfAmount, costPerServing } from "./cost";
import { waterForAmount, waterPerServing } from "./hydration";
import { basisAmount, NUTRIENT_KEYS, type Nutrients } from "./macros";
import { numberOrNull, sumOrNull } from "./numbers";
import type { Food, Recipe } from "./types";
import type { BaseUnit, EntryUnit } from "./units";

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

/**
 * All eight nutrients in one serving of a recipe: the sum over its
 * ingredients, divided by servings. Each ingredient uses
 * nutrientsForAmount, the same maths as logging that food on its own.
 *
 * One ingredient missing a nutrient makes THAT nutrient null ("—") for
 * the recipe. The other seven still work. A shown number is never a
 * lower one that quietly left an ingredient out.
 */
export function nutrientsPerServing(
  ingredients: { food: Nutrients & { unit: BaseUnit }; amount: number }[],
  servings: number,
): Nutrients {
  const perIngredient = ingredients.map((i) => nutrientsForAmount(i.food, i.amount));
  const out = {} as Nutrients;
  for (const key of NUTRIENT_KEYS) {
    const total = sumOrNull(perIngredient.map((n) => n[key]));
    out[key] =
      total === null || !Number.isFinite(servings) || servings <= 0 ? null : total / servings;
  }
  return out;
}

/** What gets copied into a log entry: it never changes after this. */
export type Snapshot = Nutrients & {
  name: string;
  unit: EntryUnit;
  amount: number;
  cost: number | null;
  water_ml: number;
};

export function snapshotFor(food: Food, amount: number): Snapshot {
  return {
    name: food.name,
    unit: food.unit,
    amount,
    ...nutrientsForAmount(food, amount),
    cost: costOfAmount(food.price, food.package_size, amount),
    water_ml: waterForAmount(food, amount),
  };
}

/**
 * What gets copied into the log when you eat `servings` of a recipe
 * (1.5 servings = 1.5 x one serving). Stored as totals for what you ate,
 * like a food entry, so Today adds it up the same way. Measured in
 * "serving", so editing it later scales it like any other entry.
 *
 * A nutrient the recipe doesn't know stays unknown here, and Today then
 * shows its usual "+ 1 food without …" note for it.
 */
export function recipeSnapshotFor(recipe: Recipe, servings: number): Snapshot {
  const scale = (value: number | null) => (value === null ? null : value * servings);
  return {
    name: recipe.name,
    unit: "serving",
    amount: servings,
    ...mapNutrients(nutrientsPerServing(recipe.ingredients, recipe.servings), scale),
    cost: scale(costPerServing(recipe.ingredients, recipe.servings)),
    water_ml: waterPerServing(recipe.ingredients, recipe.servings) * servings,
  };
}

/**
 * Changing an entry's amount scales its own snapshot (150 g -> 300 g doubles
 * everything). It deliberately does NOT re-read the food, so editing a food
 * later can never change a past day.
 */
export function scaleSnapshot(
  entry: Nutrients & { cost: number | null; water_ml: number },
  oldAmount: number,
  newAmount: number,
): Nutrients & { cost: number | null; water_ml: number } {
  const factor = newAmount / oldAmount;
  const scale = (value: number | null) =>
    value === null || !Number.isFinite(factor) ? null : value * factor;
  return {
    ...mapNutrients(entry, scale),
    cost: scale(entry.cost),
    // Water is never unknown, so it can't become null: 0 stays 0.
    water_ml: scale(entry.water_ml) ?? 0,
  };
}
