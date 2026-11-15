import { describe, expect, it } from "vitest";
import { validateIngredient, validateRecipe } from "./recipe-validation";

describe("validateRecipe", () => {
  const servingsError = (servings: unknown) => {
    const result = validateRecipe({ name: "Chili", servings });
    return !result.ok && result.fieldErrors.servings;
  };

  it("accepts a recipe, trimming the name", () => {
    expect(validateRecipe({ name: "  Overnight oats ", servings: "4" })).toEqual({
      ok: true,
      value: { name: "Overnight oats", servings: 4 },
    });
  });

  it("accepts decimal servings, with a comma too, rounded to 2 decimals like the database", () => {
    const result = (servings: string) => {
      const r = validateRecipe({ name: "Chili", servings });
      return r.ok && r.value.servings;
    };
    expect(result("2.5")).toBe(2.5);
    expect(result("2,5")).toBe(2.5);
    expect(result("0.333")).toBe(0.33);
  });

  it("needs a name under 100 characters", () => {
    const nameError = (name: unknown) => {
      const r = validateRecipe({ name, servings: "4" });
      return !r.ok && r.fieldErrors.name;
    };
    expect(nameError("")).toBeTruthy();
    expect(nameError("   ")).toBeTruthy();
    expect(nameError("a".repeat(100))).toBeFalsy();
    expect(nameError("a".repeat(101))).toBeTruthy();
  });

  it("rejects 0, negatives, blanks and words", () => {
    for (const bad of ["0", "-1", "", "abc", null]) {
      expect(servingsError(bad), String(bad)).toMatch(/above 0/);
    }
  });

  it("rejects servings so small the database would store 0", () => {
    expect(servingsError("0.001")).toMatch(/above 0/);
    expect(servingsError("0.01")).toBeFalsy();
  });

  it("asks for no comma when 1,000 could mean 1000 or 1", () => {
    expect(servingsError("1,000")).toMatch(/without a comma/);
  });

  it("allows up to 100 servings, like the database", () => {
    expect(servingsError("100")).toBeFalsy();
    expect(servingsError("101")).toMatch(/100 servings or fewer/);
  });
});

describe("validateIngredient", () => {
  it("accepts a food and an amount", () => {
    expect(validateIngredient({ foodId: "food-1", amount: "150" })).toEqual({
      ok: true,
      value: { food_id: "food-1", amount: 150 },
    });
  });

  it("needs a food and an amount above 0, within the database limit", () => {
    const errors = (raw: { foodId: unknown; amount: unknown }) => {
      const r = validateIngredient(raw);
      return r.ok ? [] : Object.keys(r.fieldErrors).sort();
    };
    expect(errors({ foodId: "", amount: "0" })).toEqual(["amount", "foodId"]);
    expect(errors({ foodId: "food-1", amount: "0.0004" })).toEqual(["amount"]);
    expect(errors({ foodId: "food-1", amount: "100000" })).toEqual([]);
    expect(errors({ foodId: "food-1", amount: "100001" })).toEqual(["amount"]);
  });
});
