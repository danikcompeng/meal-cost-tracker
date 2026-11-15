// Why a recipe total is "—": which ingredients are missing that value.
// Pure, so it can be unit tested.
//
// The rule is the same as costPerServing and nutrientsPerServing: if any
// ingredient is missing a value, the recipe's total for it is unknown.
// This finds those ingredients, using the same per-ingredient maths, so
// the screen can say "Water has no sodium" instead of a bare dash.

import { costOfAmount, costPerServing, proteinPerDollar } from "./cost";
import { waterPerServing } from "./hydration";
import type { Nutrients } from "./macros";
import { nutrientsForAmount, nutrientsPerServing } from "./nutrition";
import type { Recipe, RecipeIngredient } from "./types";

/** Anything a recipe adds up that can be unknown. */
export type RecipeValueKey = keyof Nutrients | "cost";

/**
 * Everything one serving of a recipe adds up to, worked out in one place
 * so the list, the big number and the nutrients tile can't disagree.
 */
export function recipeTotals(recipe: Recipe): {
  per: Nutrients;
  cost: number | null;
  water: number;
  proteinPerDollar: number | null;
} {
  const per = nutrientsPerServing(recipe.ingredients, recipe.servings);
  const cost = costPerServing(recipe.ingredients, recipe.servings);
  return {
    per,
    cost,
    water: waterPerServing(recipe.ingredients, recipe.servings),
    proteinPerDollar: proteinPerDollar(per.protein_g, cost),
  };
}

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

/**
 * The "Unknown because …" lines under a recipe's numbers, one per group
 * of ingredients, so an old food missing all four extras gives ONE line:
 * "Banana has no sugar, fiber, sat fat or sodium", not four.
 * `fields` are the values on screen with the word for each, in order.
 */
export function missingNotes(
  ingredients: RecipeIngredient[],
  fields: { key: RecipeValueKey; word: string }[],
): string[] {
  // Group the words by exactly which ingredients are missing them. A Map
  // keeps the order things were first added, so lines follow the screen.
  const groups = new Map<string, { names: string[]; words: string[] }>();
  for (const { key, word } of fields) {
    const names = ingredientsMissing(ingredients, key);
    if (names.length === 0) continue;
    // "\n" can't be in a food name typed into a one-line box, so it
    // safely separates names in the group's key.
    const id = names.join("\n");
    const group = groups.get(id) ?? { names, words: [] };
    group.words.push(word);
    groups.set(id, group);
  }
  return [...groups.values()].map(
    ({ names, words }) => missingSentence(names, `no ${wordsList(words)}`) as string,
  );
}

/**
 * Why a food can't be deleted or change unit: it's in a recipe. Removing
 * it silently would make the recipe cheaper and lighter than it is, and
 * a new unit would turn "150 g" into "150 items".
 */
export function usedInRecipesMessage(names: string[], change: "delete" | "unit"): string {
  const those = names.length === 1 ? "that recipe" : "those recipes";
  return change === "delete"
    ? `It's in ${namesList(names)}. Remove it from ${those} first.`
    : `It's in ${namesList(names)}, so its unit can't change. Remove it from ${those} first, or add it as a new food.`;
}

// Two names at most, so the line stays short on a phone.
function namesList(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

// "sugar", "sugar or fiber", "sugar, fiber or sodium".
function wordsList(words: string[]): string {
  if (words.length === 1) return words[0];
  return `${words.slice(0, -1).join(", ")} or ${words[words.length - 1]}`;
}
