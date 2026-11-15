import type { Nutrients } from "./macros";
import type { Meal } from "./meals";
import type { BaseUnit, EntryUnit } from "./units";

/** Calories and nutrients are per 100 g, per 100 ml, or per 1 item ("each"). */
export type Food = Nutrients & {
  id: string;
  name: string;
  brand: string | null;
  /** In the standard form from lib/barcode.ts, or null if it has none. */
  barcode: string | null;
  price: number;
  package_size: number;
  unit: BaseUnit;
  /** The "Counts toward hydration" switch. Only ever true for ml foods. */
  counts_toward_hydration: boolean;
};

/**
 * One food in a recipe, and how much of it goes into the WHOLE recipe,
 * in the food's own unit (150 g of oats, 2 eggs). Not per serving.
 */
export type RecipeIngredient = { food: Food; amount: number };

/**
 * A staple meal made from your foods. Recipes are live: change a food's
 * price or protein and the recipe changes too. What you logged doesn't,
 * because a log entry keeps its own copy (see recipeSnapshotFor).
 */
export type Recipe = {
  id: string;
  name: string;
  /** How many servings the whole recipe makes. Above 0, decimals allowed. */
  servings: number;
  /** In the order you added them. */
  ingredients: RecipeIngredient[];
};

/**
 * One thing you ate: a food, or servings of a recipe. Name, unit, macros
 * and cost are a snapshot copied when it was logged, for this amount.
 * food_id / recipe_id is null if that food or recipe was deleted.
 */
export type MealEntry = Nutrients & {
  id: string;
  day: string;
  meal: Meal;
  food_id: string | null;
  recipe_id: string | null;
  name: string;
  /** "serving" for a recipe, the food's own unit otherwise. */
  unit: EntryUnit;
  amount: number;
  cost: number | null;
  /** Water this entry adds, in ml. 0 (never null) when the food doesn't count. */
  water_ml: number;
};

/** What a form action sends back to the form after it runs. */
export type FormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
  /** The id of the row that was saved, for "save, then log it". */
  id?: string;
  /** Saving clashed with a food you already have (same barcode): its id. */
  existingId?: string;
  /**
   * A new food has the same name and brand as one you have. Nothing was
   * saved; the form asks "Update existing, or keep both?".
   */
  duplicate?: {
    id: string;
    name: string;
    brand: string | null;
    /** What updating would change ("Protein 13 g → 11 g"); empty = same. */
    changes: string[];
  };
};
