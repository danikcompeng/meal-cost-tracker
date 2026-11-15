// Why a recipe total is "—": which ingredients are missing that value.
// Pure, so it can be unit tested.
//
// The rule is the same as costPerServing and nutrientsPerServing: if any
// ingredient is missing a value, the recipe's total for it is unknown.
// This finds those ingredients, using the same per-ingredient maths, so
// the screen can say "Water has no sodium" instead of a bare dash.

import { costOfAmount } from "./cost";
import type { Nutrients } from "./macros";
import { nutrientsForAmount } from "./nutrition";
import type { RecipeIngredient } from "./types";

/** Anything a recipe adds up that can be unknown. */
export type RecipeValueKey = keyof Nutrients | "cost";

/**
 * Names of the ingredients with no value for `key`, in recipe order.
 * Empty means every ingredient has it.
 */
export function ingredientsMissing(ingredients: RecipeIngredient[], key: RecipeValueKey): string[] {
  return ingredients
    .filter(({ food, amount }) => {
      const value =
        key === "cost"
          ? costOfAmount(food.price, food.package_size, amount)
          : nutrientsForAmount(food, amount)[key];
      return value === null || !Number.isFinite(value);
    })
    .map(({ food }) => food.name);
}

/**
 * "Water has no sodium", "Oat milk and Banana have no fiber",
 * "Oat milk, Banana and 2 more have no fiber". `what` is the end of the
 * sentence: "no sodium", "no price yet". Null when nobody is missing it.
 */
export function missingSentence(names: string[], what: string): string | null {
  if (names.length === 0) return null;
  const verb = names.length === 1 ? "has" : "have";
  return `${namesList(names)} ${verb} ${what}`;
}

// Two names at most, so the line stays short on a phone.
function namesList(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}
