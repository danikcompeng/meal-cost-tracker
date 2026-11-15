import { describe, expect, it } from "vitest";
import { NO_EXTRAS } from "./macros";
import {
  nutrientsForAmount,
  nutrientsFromRow,
  nutrientsPerServing,
  recipeSnapshotFor,
  scaleSnapshot,
  snapshotFor,
} from "./nutrition";
import type { Food, Recipe } from "./types";

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

const egg: Food = {
  id: "egg",
  name: "Egg",
  brand: null,
  barcode: null,
  price: 4.8,
  package_size: 12,
  unit: "each",
  kcal: 72,
  protein_g: 6.3,
  carbs_g: 0.4,
  fat_g: 4.8,
  ...NO_EXTRAS,
  counts_toward_hydration: false,
};

const rice: Food = {
  id: "rice",
  name: "Rice",
  brand: null,
  barcode: null,
  price: 4.5,
  package_size: 907.18,
  unit: "g",
  kcal: 360,
  protein_g: 7,
  carbs_g: 79,
  fat_g: 0.6,
  ...NO_EXTRAS,
  counts_toward_hydration: false,
};

const water: Food = {
  ...rice,
  id: "water",
  name: "Water",
  unit: "ml",
  kcal: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  counts_toward_hydration: true,
};

// Decimal maths in JavaScript is a hair off (0.1 + 0.2 = 0.30000000000000004),
// so compare to 9 decimal places instead of exactly.
function expectClose(actual: Record<string, unknown>, expected: Record<string, number | null>) {
  for (const [key, value] of Object.entries(expected)) {
    if (value === null) expect(actual[key], key).toBeNull();
    else expect(actual[key], key).toBeCloseTo(value, 9);
  }
}

describe("nutrientsForAmount", () => {
  it("scales per-100 g values to the amount", () => {
    expectClose(nutrientsForAmount(oats, 150), {
      kcal: 568.5,
      protein_g: 19.5,
      carbs_g: 90,
      fat_g: 10.5,
      sugar_g: 1.5,
      fiber_g: 15,
      saturated_fat_g: 1.8,
      sodium_mg: 9,
    });
  });

  it("uses per-1 values for 'each' foods", () => {
    expectClose(nutrientsForAmount(egg, 2), {
      kcal: 144,
      protein_g: 12.6,
      carbs_g: 0.8,
      fat_g: 9.6,
      // The egg has none of the extras: they stay missing, never 0.
      ...NO_EXTRAS,
    });
  });

  it("keeps a missing macro missing and a 0 as 0", () => {
    const result = nutrientsForAmount({ ...oats, kcal: null, fat_g: 0 }, 200);
    expect(result.kcal).toBeNull();
    expect(result.fat_g).toBe(0);
    expect(result.protein_g).toBe(26);
  });
});

describe("snapshotFor", () => {
  it("copies name, unit, amount, macros and cost", () => {
    const snap = snapshotFor(oats, 150);
    expect(snap).toMatchObject({ name: "Rolled oats", unit: "g", amount: 150 });
    expectClose(snap, { kcal: 568.5, protein_g: 19.5, cost: 1.05 }); // 150 g of $3.50 / 500 g
  });

  it("has no cost when the food has no usable price", () => {
    expect(snapshotFor({ ...oats, package_size: 0 }, 150).cost).toBeNull();
  });

  it("keeps a free food at a real $0", () => {
    expect(snapshotFor({ ...oats, price: 0 }, 150).cost).toBe(0);
  });

  it("copies the water for a food that counts toward hydration, and 0 otherwise", () => {
    expect(snapshotFor(water, 250).water_ml).toBe(250);
    expect(snapshotFor({ ...water, counts_toward_hydration: false }, 250).water_ml).toBe(0);
    expect(snapshotFor(oats, 150).water_ml).toBe(0);
  });
});

describe("nutrientsFromRow", () => {
  it("turns database text into numbers and keeps blanks blank, never 0", () => {
    const row = { kcal: "379.0", protein_g: 13, carbs_g: null, fat_g: "0", sodium_mg: "6.0" };
    expect(nutrientsFromRow(row)).toEqual({
      kcal: 379,
      protein_g: 13,
      carbs_g: null,
      fat_g: 0,
      sugar_g: null,
      fiber_g: null,
      saturated_fat_g: null,
      sodium_mg: 6,
    });
  });
});

describe("scaleSnapshot", () => {
  const logged = {
    kcal: 568.5,
    protein_g: 19.5,
    carbs_g: 90,
    fat_g: null,
    sugar_g: 1.5,
    fiber_g: null,
    saturated_fat_g: 1.8,
    sodium_mg: 9,
    cost: 1.05,
    water_ml: 0,
  };

  it("scales water too, and keeps 0 at 0 (never unknown)", () => {
    expect(scaleSnapshot({ ...logged, water_ml: 250 }, 250, 500).water_ml).toBe(500);
    expect(scaleSnapshot(logged, 150, 300).water_ml).toBe(0);
  });

  it("scales everything by the new amount", () => {
    expectClose(scaleSnapshot(logged, 150, 300), {
      kcal: 1137,
      protein_g: 39,
      carbs_g: 180,
      fat_g: null,
      sugar_g: 3,
      fiber_g: null,
      saturated_fat_g: 3.6,
      sodium_mg: 18,
      cost: 2.1,
    });
  });

  it("keeps missing values missing", () => {
    const result = scaleSnapshot({ ...logged, cost: null }, 150, 75);
    expect(result.fat_g).toBeNull();
    expect(result.cost).toBeNull();
  });

  it("doesn't change anything when the amount stays the same", () => {
    expect(scaleSnapshot(logged, 150, 150)).toEqual(logged);
  });

  it("editing 1 g up to 500 g gives the same numbers as logging 500 g", () => {
    // If snapshots were rounded, 1 g of rice ($0.00496) would be saved as
    // $0.0050 and scale up to $2.50 instead of $2.48.
    const edited = scaleSnapshot(snapshotFor(rice, 1), 1, 500);
    const direct = snapshotFor(rice, 500);
    expectClose(edited, {
      kcal: direct.kcal,
      protein_g: direct.protein_g,
      carbs_g: direct.carbs_g,
      fat_g: direct.fat_g,
      cost: direct.cost,
    });
    expect(edited.cost).toBeCloseTo(2.48, 2);
  });
});

// Tap water: free, 0 kcal and 0 macros, counts toward hydration. Like a
// real Water food, it has no sodium entered (the 0 kcal rule never fills
// sodium), and none of the other extras either.
const tapWater: Food = { ...water, price: 0, package_size: 1000 };

// 100 g oats (379 kcal, 13 g protein, $0.70) + 2 eggs (144 kcal, 12.6 g
// protein, $0.80) + 300 ml tap water, making 2 servings.
const oatsAndEggs: Recipe = {
  id: "r1",
  name: "Oats and eggs",
  servings: 2,
  ingredients: [
    { food: oats, amount: 100 },
    { food: egg, amount: 2 },
    { food: tapWater, amount: 300 },
  ],
};

describe("nutrientsPerServing", () => {
  it("works out all eight nutrients per serving", () => {
    // 150 g oats, 3 servings = 50 g of oats each
    expectClose(nutrientsPerServing([{ food: oats, amount: 150 }], 3), {
      kcal: 189.5,
      protein_g: 6.5,
      carbs_g: 30,
      fat_g: 3.5,
      sugar_g: 0.5,
      fiber_g: 5,
      saturated_fat_g: 0.6,
      sodium_mg: 3,
    });
  });

  it("mixes g, each and ml foods, each by its own basis", () => {
    expectClose(nutrientsPerServing(oatsAndEggs.ingredients, 2), {
      kcal: 261.5, // (379 + 144 + 0) / 2
      protein_g: 12.8, // (13 + 12.6 + 0) / 2
      carbs_g: 30.4,
      fat_g: 8.3,
    });
  });

  it("makes ONLY the nutrient an ingredient is missing unknown, never a lower number", () => {
    // Egg and water have no fiber entered, so the recipe's fiber is
    // unknown, even though oats has 10 g. Protein is still known.
    const result = nutrientsPerServing(oatsAndEggs.ingredients, 2);
    expect(result.fiber_g).toBeNull();
    expect(result.sodium_mg).toBeNull();
    expect(result.protein_g).toBeCloseTo(12.8, 9);
  });

  it("keeps a real 0 at 0", () => {
    const result = nutrientsPerServing([{ food: tapWater, amount: 500 }], 1);
    expect(result.kcal).toBe(0);
    expect(result.protein_g).toBe(0);
  });

  it("is all unknown for an empty recipe or servings of 0", () => {
    const empty = nutrientsPerServing([], 2);
    const noServings = nutrientsPerServing([{ food: oats, amount: 150 }], 0);
    for (const value of [...Object.values(empty), ...Object.values(noServings)]) {
      expect(value).toBeNull();
    }
  });
});

describe("recipeSnapshotFor", () => {
  it("copies the name, measures in servings and scales one serving by what you ate", () => {
    const snap = recipeSnapshotFor(oatsAndEggs, 1.5);
    expect(snap).toMatchObject({ name: "Oats and eggs", unit: "serving", amount: 1.5 });
    expectClose(snap, {
      kcal: 392.25, // 261.5 x 1.5
      protein_g: 19.2, // 12.8 x 1.5
      cost: 1.125, // ($0.70 + $0.80 + $0) / 2 x 1.5
      water_ml: 225, // 300 / 2 x 1.5
      fiber_g: null, // unknown stays unknown, Today shows "+ 1 food without fiber"
    });
  });

  it("has no cost when one ingredient has no usable price", () => {
    const noPrice: Recipe = {
      ...oatsAndEggs,
      ingredients: [...oatsAndEggs.ingredients, { food: { ...rice, package_size: 0 }, amount: 50 }],
    };
    expect(recipeSnapshotFor(noPrice, 1).cost).toBeNull();
  });

  it("adds no water for an ingredient with the hydration switch off", () => {
    const cooking: Recipe = {
      ...oatsAndEggs,
      ingredients: [{ food: { ...tapWater, counts_toward_hydration: false }, amount: 2000 }],
    };
    expect(recipeSnapshotFor(cooking, 1).water_ml).toBe(0);
  });

  it("editing 1 serving up to 3 gives the same numbers as logging 3", () => {
    // Changing servings on Today scales the saved copy, like any entry.
    const edited = scaleSnapshot(recipeSnapshotFor(oatsAndEggs, 1), 1, 3);
    const direct = recipeSnapshotFor(oatsAndEggs, 3);
    expectClose(edited, {
      kcal: direct.kcal,
      protein_g: direct.protein_g,
      cost: direct.cost,
      water_ml: direct.water_ml,
      fiber_g: null,
    });
  });
});
