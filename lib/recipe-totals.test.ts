import { describe, expect, it } from "vitest";
import { costPerServing } from "./cost";
import { NO_EXTRAS, NUTRIENT_KEYS } from "./macros";
import { nutrientsPerServing } from "./nutrition";
import { ingredientsMissing, missingSentence } from "./recipe-totals";
import type { Food, RecipeIngredient } from "./types";

const oats: Food = {
  id: "oats",
  name: "Rolled oats",
  brand: null,
  barcode: null,
  price: 3.5,
  package_size: 500,
  unit: "g",
  kcal: 379,
  protein_g: 13,
  carbs_g: 60,
  fat_g: 7,
  sugar_g: 1,
  fiber_g: 10,
  saturated_fat_g: 1.2,
  sodium_mg: 6,
  counts_toward_hydration: false,
};

// No extras entered, and a package size of 0, so no usable price.
const banana: Food = { ...oats, id: "banana", name: "Banana", unit: "each", package_size: 0, ...NO_EXTRAS };
const water: Food = {
  ...oats,
  id: "water",
  name: "Water",
  unit: "ml",
  price: 0,
  package_size: 1000,
  kcal: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  sugar_g: 0,
  fiber_g: 0,
  saturated_fat_g: 0,
  sodium_mg: null,
  counts_toward_hydration: true,
};

const ingredients: RecipeIngredient[] = [
  { food: oats, amount: 100 },
  { food: banana, amount: 1 },
  { food: water, amount: 250 },
];

describe("ingredientsMissing", () => {
  it("names the ingredients without a value, in recipe order", () => {
    expect(ingredientsMissing(ingredients, "sodium_mg")).toEqual(["Banana", "Water"]);
    expect(ingredientsMissing(ingredients, "fiber_g")).toEqual(["Banana"]);
    expect(ingredientsMissing(ingredients, "cost")).toEqual(["Banana"]);
  });

  it("is empty when every ingredient has it (a real 0 counts as having it)", () => {
    expect(ingredientsMissing(ingredients, "protein_g")).toEqual([]);
    expect(ingredientsMissing([], "kcal")).toEqual([]);
  });

  it("agrees with the totals: a total is unknown exactly when someone is missing it", () => {
    const perServing = nutrientsPerServing(ingredients, 2);
    for (const key of NUTRIENT_KEYS) {
      expect(perServing[key] === null, key).toBe(ingredientsMissing(ingredients, key).length > 0);
    }
    expect(costPerServing(ingredients, 2)).toBeNull();
  });
});

describe("missingSentence", () => {
  it("names up to two ingredients, then says how many more", () => {
    expect(missingSentence(["Water"], "no sodium")).toBe("Water has no sodium");
    expect(missingSentence(["Oat milk", "Banana"], "no fiber")).toBe(
      "Oat milk and Banana have no fiber",
    );
    expect(missingSentence(["Oat milk", "Banana", "Egg", "Rice"], "no fiber")).toBe(
      "Oat milk, Banana and 2 more have no fiber",
    );
    expect(missingSentence(["Rolled oats"], "no price yet")).toBe("Rolled oats has no price yet");
  });

  it("is null when nobody is missing it", () => {
    expect(missingSentence([], "no sodium")).toBeNull();
  });
});
