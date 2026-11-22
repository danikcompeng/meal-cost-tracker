import { describe, expect, it } from "vitest";
import {
  DEMO_ENTRIES,
  DEMO_FOODS,
  DEMO_RECIPES,
  demoEntryRows,
  demoIngredientRows,
  demoRecipes,
  isSample,
  needsReseed,
} from "./demo-seed";
import type { Food } from "./types";

// The foods as the database would send them back: the same rows plus an
// id (and no brand or barcode).
const foods = new Map<string, Food>(
  DEMO_FOODS.map((row, i) => [row.name, { ...row, id: `food-${i}`, brand: null, barcode: null }]),
);
const recipeIds = new Map(DEMO_RECIPES.map((r, i) => [r.name, `recipe-${i}`]));
const recipes = demoRecipes(foods, recipeIds);
const start = new Date("2026-11-22T12:00:00.000Z");

describe("the sample data", () => {
  it("has each food and recipe name once (the seed looks them up by name)", () => {
    expect(new Set(DEMO_FOODS.map((f) => f.name)).size).toBe(DEMO_FOODS.length);
    expect(new Set(DEMO_RECIPES.map((r) => r.name)).size).toBe(DEMO_RECIPES.length);
  });

  it("only uses foods and recipes that exist", () => {
    expect(() => demoEntryRows("2026-11-22", foods, recipes, start)).not.toThrow();
    for (const e of DEMO_ENTRIES) {
      const names = e.kind === "food" ? DEMO_FOODS.map((f) => f.name) : DEMO_RECIPES.map((r) => r.name);
      expect(names).toContain(e.name);
    }
  });

  it("only counts water toward hydration, and only water is an ml food", () => {
    expect(DEMO_FOODS.filter((f) => f.counts_toward_hydration).map((f) => f.name)).toEqual(["Water"]);
  });
});

describe("demoIngredientRows", () => {
  it("keeps each recipe's ingredients in the listed order, a second apart", () => {
    const rows = demoIngredientRows(recipes, start);
    expect(rows).toHaveLength(DEMO_RECIPES.reduce((n, r) => n + r.ingredients.length, 0));
    expect(rows[0]).toEqual({
      recipe_id: "recipe-0",
      food_id: foods.get("Chicken thighs")!.id,
      amount: 800,
      created_at: "2026-11-22T12:00:01.000Z",
    });
    expect(rows[1].created_at).toBe("2026-11-22T12:00:02.000Z");
  });
});

describe("demoEntryRows", () => {
  const rows = demoEntryRows("2026-11-22", foods, recipes, start);

  it("dates meals back from today", () => {
    expect(rows.map((r) => r.day)).toEqual([
      "2026-11-22", "2026-11-22", "2026-11-22", "2026-11-22",
      "2026-11-21", "2026-11-21", "2026-11-20", "2026-11-20", "2026-11-17",
    ]);
  });

  it("works out a recipe's numbers like logging it does (per serving x servings)", () => {
    const bowl = rows[1];
    expect(bowl).toMatchObject({ recipe_id: "recipe-0", name: "Chicken rice bowl", unit: "serving", amount: 1 });
    // (800 g x 177 + 300 g x 360 + 340 g x 34) / 100, over 4 servings.
    expect(bowl.kcal).toBeCloseTo(652.9);
    // (800 x 24 + 300 x 7 + 340 x 2.8) / 100 / 4
    expect(bowl.protein_g).toBeCloseTo(55.63);
    // ($8.99 x 0.8 + $2.49 x 0.3 + the whole $1.99 bag) / 4
    expect(bowl.cost).toBeCloseTo(2.48225);
    // Unknown stays unknown: no ingredient has sodium.
    expect(bowl.sodium_mg).toBeNull();
  });

  it("logs water as water, with a known price of $0", () => {
    const water = rows[3];
    expect(water).toMatchObject({ name: "Water", unit: "ml", amount: 750, water_ml: 750, cost: 0, kcal: 0 });
    expect(water.sodium_mg).toBeNull();
  });

  it("gives every row exactly one of a food or a recipe", () => {
    for (const row of rows) {
      expect(["food_id" in row, "recipe_id" in row].filter(Boolean)).toHaveLength(1);
    }
  });
});

describe("needsReseed", () => {
  const now = new Date("2026-11-22T12:00:00Z");
  const meta = (at: string) => ({ demo_seeded_at: at });

  it("reseeds a demo that was never seeded, or whose date can't be read", () => {
    expect(needsReseed(null, now)).toBe(true);
    expect(needsReseed({}, now)).toBe(true);
    expect(needsReseed(meta("yesterday-ish"), now)).toBe(true);
    expect(needsReseed({ demo_seeded_at: 12 }, now)).toBe(true);
  });

  it("keeps data under an hour old and reseeds after that", () => {
    expect(needsReseed(meta("2026-11-22T11:30:00Z"), now)).toBe(false);
    expect(needsReseed(meta("2026-11-22T11:00:00Z"), now)).toBe(false);
    expect(needsReseed(meta("2026-11-22T10:59:59Z"), now)).toBe(true);
  });

  it("allows a little clock difference but not a date set in the future", () => {
    expect(needsReseed(meta("2026-11-22T12:02:00Z"), now)).toBe(false);
    expect(needsReseed(meta("2027-01-01T00:00:00Z"), now)).toBe(true);
  });
});

describe("isSample", () => {
  // Postgres sends microseconds; the newest sample row is exactly the date.
  const meta = { demo_seeded_at: "2026-11-22T12:00:00.123456+00:00" };

  it("counts what the last seed made, up to and including its date", () => {
    expect(isSample("2026-11-22T11:59:59+00:00", meta)).toBe(true);
    expect(isSample("2026-11-22T12:00:00.123456+00:00", meta)).toBe(true);
  });

  it("leaves anything made after the seed free to change", () => {
    expect(isSample("2026-11-22T12:00:01+00:00", meta)).toBe(false);
  });

  it("protects nothing when there's no seed date", () => {
    expect(isSample("2026-11-22T11:00:00+00:00", null)).toBe(false);
    expect(isSample("2026-11-22T11:00:00+00:00", {})).toBe(false);
  });
});
