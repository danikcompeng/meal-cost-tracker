// Checks a recipe and its ingredients from the forms. Pure, so it can be
// unit tested. The limits match the database rules in migration 011.

import { checkAmount, type Result } from "./entry-validation";
import { AMBIGUOUS_COMMA, parseDecimal } from "./numbers";

export type RecipeInput = { name: string; servings: number };
export type IngredientInput = { food_id: string; amount: number };

const MAX_SERVINGS = 100; // matches the database rule

export function validateRecipe(raw: { name: unknown; servings: unknown }): Result<RecipeInput> {
  const fieldErrors: Record<string, string> = {};

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) fieldErrors.name = "Give it a name.";
  else if (name.length > 100) fieldErrors.name = "Keep it under 100 characters.";

  // The database keeps servings to 2 decimals (2.5, 0.75), so round first:
  // 0.001 would be saved as 0.00 and refused with a vague error.
  const parsed = parseDecimal(raw.servings);
  const servings = typeof parsed === "number" ? Math.round(parsed * 100) / 100 : null;
  if (parsed === "ambiguous") fieldErrors.servings = AMBIGUOUS_COMMA;
  else if (servings === null || servings <= 0) {
    fieldErrors.servings = "Enter servings above 0, like 4.";
  } else if (servings > MAX_SERVINGS) {
    fieldErrors.servings = "Keep it to 100 servings or fewer.";
  }

  if (servings === null || Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true, value: { name, servings } };
}

/**
 * One ingredient: which food, and how much goes into the whole recipe,
 * in the food's own unit. Same amount rules as logging that food.
 */
export function validateIngredient(raw: { foodId: unknown; amount: unknown }): Result<IngredientInput> {
  const fieldErrors: Record<string, string> = {};

  const foodId = typeof raw.foodId === "string" ? raw.foodId.trim() : "";
  if (!foodId) fieldErrors.foodId = "Pick a food.";

  const checked = checkAmount(raw.amount);
  if ("error" in checked) fieldErrors.amount = checked.error;

  if ("error" in checked || Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true, value: { food_id: foodId, amount: checked.amount } };
}
