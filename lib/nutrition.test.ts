import { describe, expect, it } from "vitest";
import { NO_EXTRAS } from "./macros";
import { nutrientsForAmount, nutrientsFromRow, scaleSnapshot, snapshotFor } from "./nutrition";
import type { Food } from "./types";

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
