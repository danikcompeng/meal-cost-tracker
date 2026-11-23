import { describe, expect, it } from "vitest";
import { costPerServing } from "./cost";
import { NO_EXTRAS, NUTRIENT_KEYS } from "./macros";
import { nutrientsPerServing } from "./nutrition";
import { NO_SERVING } from "./servings";
import {
  ingredientsMissing,
  missingNotes,
  missingSentence,
  recipeTotals,
  usedInRecipesMessage,
} from "./recipe-totals";
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
  ...NO_SERVING,
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
  ...NO_SERVING,
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

describe("recipeTotals", () => {
  it("works out one serving: cost, nutrients, water and protein per $", () => {
    // 100 g oats ($0.70, 13 g protein) + 250 ml water ($0, counts), 2 servings
    const totals = recipeTotals({
      id: "r",
      name: "Porridge",
      servings: 2,
      ingredients: [
        { food: oats, amount: 100 },
        { food: water, amount: 250 },
      ],
    });
    expect(totals.cost).toBeCloseTo(0.35, 10);
    expect(totals.per.protein_g).toBeCloseTo(6.5, 10);
    expect(totals.water).toBe(125);
    expect(totals.proteinPerDollar).toBeCloseTo(6.5 / 0.35, 10);
    // Water has no sodium entered here, so sodium is unknown.
    expect(totals.per.sodium_mg).toBeNull();
  });

  it("hides protein per $ when the cost is unknown", () => {
    const totals = recipeTotals({ id: "r", name: "Banana", servings: 1, ingredients: [{ food: banana, amount: 1 }] });
    expect(totals.cost).toBeNull();
    expect(totals.proteinPerDollar).toBeNull();
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

describe("missingNotes", () => {
  const fields = [
    { key: "protein_g", word: "protein" },
    { key: "sugar_g", word: "sugar" },
    { key: "fiber_g", word: "fiber" },
    { key: "sodium_mg", word: "sodium" },
  ] as const;

  it("gives one line per group of ingredients, in screen order", () => {
    // Banana misses sugar, fiber and sodium; Water misses sodium only.
    expect(missingNotes(ingredients, [...fields])).toEqual([
      "Banana has no sugar or fiber",
      "Banana and Water have no sodium",
    ]);
  });

  it("lists three or more words with commas", () => {
    const onlyBanana = [{ food: banana, amount: 1 }];
    expect(missingNotes(onlyBanana, [...fields])).toEqual(["Banana has no sugar, fiber or sodium"]);
  });

  it("is empty when nothing is missing", () => {
    expect(missingNotes([{ food: oats, amount: 100 }], [...fields])).toEqual([]);
  });
});

describe("usedInRecipesMessage", () => {
  it("says which recipes, for deleting", () => {
    expect(usedInRecipesMessage(["Overnight oats"], "delete")).toBe(
      "It's in Overnight oats. Remove it from that recipe first.",
    );
    expect(usedInRecipesMessage(["Chili", "Overnight oats"], "delete")).toBe(
      "It's in Chili and Overnight oats. Remove it from those recipes first.",
    );
  });

  it("explains why the unit can't change", () => {
    expect(usedInRecipesMessage(["Chili"], "unit")).toBe(
      "It's in Chili, so its unit can't change. Remove it from that recipe first, or add it as a new food.",
    );
  });
});
