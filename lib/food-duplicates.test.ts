import { describe, expect, it } from "vitest";
import { duplicateChanges, findDuplicate, normalizeName } from "./food-duplicates";
import type { FoodInput } from "./food-validation";
import { NO_EXTRAS } from "./macros";

describe("normalizeName", () => {
  it("ignores case, spaces at the ends and extra spaces inside", () => {
    expect(normalizeName("  Rolled   Oats ")).toBe("rolled oats");
  });

  it("treats a missing brand and a blank one the same", () => {
    expect(normalizeName(null)).toBe("");
    expect(normalizeName("   ")).toBe("");
  });
});

describe("findDuplicate", () => {
  const foods = [
    { id: "new", name: "Rolled oats", brand: "Quaker" },
    { id: "old", name: "rolled  OATS", brand: "quaker" },
    { id: "plain", name: "Rolled oats", brand: null },
  ];

  it("finds the same name and brand, ignoring case and spaces, newest first", () => {
    expect(findDuplicate(foods, { name: " ROLLED oats", brand: "QUAKER " })?.id).toBe("new");
  });

  it("only matches a blank brand with a blank brand", () => {
    expect(findDuplicate(foods, { name: "Rolled oats", brand: null })?.id).toBe("plain");
    expect(findDuplicate(foods.slice(0, 2), { name: "Rolled oats", brand: null })).toBeNull();
  });

  it("doesn't match a different name or brand", () => {
    expect(findDuplicate(foods, { name: "Steel cut oats", brand: "Quaker" })).toBeNull();
    expect(findDuplicate(foods, { name: "Rolled oats", brand: "Bob's" })).toBeNull();
    expect(findDuplicate([], { name: "Rolled oats", brand: null })).toBeNull();
  });
});

describe("duplicateChanges", () => {
  const saved = {
    kcal: 379,
    protein_g: 13,
    carbs_g: 60,
    fat_g: 7,
    ...NO_EXTRAS,
    price: 3.5,
    package_size: 500,
    unit: "g" as const,
    counts_toward_hydration: false,
  };
  const input: FoodInput = { ...saved, name: "Rolled oats", brand: null, barcode: null };

  it("is empty when nothing would change", () => {
    expect(duplicateChanges(saved, input)).toEqual([]);
  });

  it("lists what would change, old → new, with — for a blank", () => {
    expect(duplicateChanges(saved, { ...input, protein_g: 11, sugar_g: 1 })).toEqual([
      "Protein 13 g → 11 g",
      "Sugar — → 1 g",
    ]);
  });

  it("compares price per 100 g, so a bigger bag at the same rate isn't a change", () => {
    expect(duplicateChanges(saved, { ...input, price: 7, package_size: 1000 })).toEqual([]);
    expect(duplicateChanges(saved, { ...input, price: 3.8 })).toEqual([
      "Price $0.70 / 100 g → $0.76 / 100 g",
    ]);
  });

  it("puts a unit change first, and says when hydration changes", () => {
    const water = { ...input, unit: "ml" as const, counts_toward_hydration: true };
    expect(duplicateChanges(saved, water)).toEqual([
      "Measured by g → ml",
      "Price $0.70 / 100 g → $0.70 / 100 ml",
      "Counts toward hydration off → on",
    ]);
  });
});
