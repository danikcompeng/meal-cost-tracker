import { describe, expect, it } from "vitest";
import { NO_EXTRAS } from "./macros";
import type { Meal } from "./meals";
import {
  swappedFrom,
  UNDO_CHANGED,
  validateEntryChange,
  validateNewEntry,
  validateNewRecipeEntry,
  validateRestoredEntry,
  validateSwap,
  validateUndoSwap,
} from "./entry-validation";

const today = "2026-11-09";
const valid = { foodId: "food-1", day: today, meal: "breakfast", amount: "150" };

describe("validateNewEntry", () => {
  it("accepts a normal entry", () => {
    expect(validateNewEntry(valid, today)).toEqual({
      ok: true,
      value: { food_id: "food-1", day: today, meal: "breakfast", amount: 150 },
    });
  });

  it("allows logging to a past day", () => {
    expect(validateNewEntry({ ...valid, day: "2026-11-01" }, today).ok).toBe(true);
  });

  it("rejects a missing food, a future day and an unknown meal", () => {
    const result = validateNewEntry(
      { foodId: "", day: "2026-11-20", meal: "brunch", amount: "150" },
      today,
    );
    expect(!result.ok && Object.keys(result.fieldErrors).sort()).toEqual(["day", "foodId", "meal"]);
  });
});

describe("validateEntryChange", () => {
  const amountError = (amount: unknown) => {
    const result = validateEntryChange({ meal: "lunch", amount });
    return !result.ok && result.fieldErrors.amount;
  };

  it("accepts a comma and rounds to 3 decimals like the database", () => {
    const result = validateEntryChange({ meal: "lunch", amount: "1,23456" });
    expect(result.ok && result.value.amount).toBe(1.235);
  });

  it("rejects 0, negatives, blanks, words and Infinity", () => {
    for (const bad of ["0", "-5", "", "  ", "abc", "Infinity", null]) {
      expect(amountError(bad)).toBeTruthy();
    }
  });

  it("rejects an amount so tiny the database would store it as 0", () => {
    expect(amountError("0.0004")).toBeTruthy();
    expect(amountError("0.001")).toBeFalsy();
  });

  it("asks for no comma when 1,000 could mean 1000 or 1", () => {
    expect(amountError("1,000")).toMatch(/without a comma/);
  });

  it("rejects amounts over the database limit", () => {
    expect(amountError("100000")).toBeFalsy();
    expect(amountError("100001")).toBeTruthy();
  });

  it("uses the servings rules for a recipe entry", () => {
    const servingsError = (amount: unknown) => {
      const result = validateEntryChange({ meal: "lunch", amount, unit: "serving" });
      return !result.ok && result.fieldErrors.amount;
    };
    expect(servingsError("2")).toBeFalsy();
    expect(servingsError("25")).toMatch(/a lot of servings/);
    // A food entry of 25 g is fine.
    expect(amountError("25")).toBeFalsy();
  });
});

describe("validateNewRecipeEntry", () => {
  const recipe = { recipeId: "recipe-1", day: today, meal: "lunch", amount: "1.5" };

  it("accepts 1.5 servings", () => {
    expect(validateNewRecipeEntry(recipe, today)).toEqual({
      ok: true,
      value: { recipe_id: "recipe-1", day: today, meal: "lunch", amount: 1.5 },
    });
  });

  it("rejects a missing recipe, a future day and an unknown meal", () => {
    const result = validateNewRecipeEntry(
      { recipeId: " ", day: "2026-11-20", meal: "brunch", amount: "1" },
      today,
    );
    expect(!result.ok && Object.keys(result.fieldErrors).sort()).toEqual(["day", "meal", "recipeId"]);
  });

  it("asks for servings above 0, and at most 20", () => {
    const error = (amount: string) => {
      const result = validateNewRecipeEntry({ ...recipe, amount }, today);
      return !result.ok && result.fieldErrors.amount;
    };
    expect(error("0")).toMatch(/servings above 0/);
    expect(error("")).toMatch(/servings above 0/);
    expect(error("20")).toBeFalsy();
    expect(error("21")).toMatch(/a lot of servings/);
    expect(error("1,5")).toBeFalsy();
  });
});

const ENTRY_ID = "3f2b6c1e-8a4d-4f7e-9b2a-1c5d7e9f0a12";
const RECIPE_ID = "7a1c2e3f-4b5d-4c6e-8f9a-0b1c2d3e4f5a";

describe("validateSwap", () => {
  it("accepts two uuids", () => {
    expect(validateSwap({ entryId: ENTRY_ID, recipeId: RECIPE_ID })).toEqual({
      ok: true,
      value: { entryId: ENTRY_ID, recipeId: RECIPE_ID },
    });
  });

  it("refuses anything that isn't a uuid", () => {
    for (const bad of ["", "dal", 42, null, undefined, `${RECIPE_ID} or 1=1`]) {
      expect(validateSwap({ entryId: ENTRY_ID, recipeId: bad }).ok).toBe(false);
      expect(validateSwap({ entryId: bad, recipeId: RECIPE_ID }).ok).toBe(false);
    }
  });
});

describe("validateUndoSwap", () => {
  // Overnight oats, 1.5 servings at lunch, before it was swapped.
  const before = {
    recipe_id: RECIPE_ID,
    name: "Overnight oats",
    meal: "lunch",
    amount: 1.5,
    kcal: 750,
    protein_g: 36,
    carbs_g: 90,
    fat_g: 20,
    ...NO_EXTRAS,
    cost: 1.68,
    water_ml: 0,
  };
  const now: { meal: Meal; amount: number } = { meal: "lunch", amount: 1.5 };
  const errors = (raw: unknown, at = now) => {
    const result = validateUndoSwap(raw, at);
    return result.ok ? null : result.fieldErrors;
  };

  it("accepts the entry's old copy, unknowns and all", () => {
    const result = validateUndoSwap(before, now);
    expect(result.ok && result.value).toEqual(before);
    // A recipe deleted since, unknown protein and cost: still fine.
    expect(errors({ ...before, recipe_id: null, protein_g: null, cost: null })).toBeNull();
  });

  it("refuses negative, text, NaN and Infinity numbers", () => {
    for (const bad of [-1, "36", Number.NaN, Number.POSITIVE_INFINITY, undefined, true]) {
      expect(errors({ ...before, protein_g: bad })).toHaveProperty("protein_g");
      expect(errors({ ...before, cost: bad })).toHaveProperty("cost");
      expect(errors({ ...before, water_ml: bad })).toHaveProperty("water_ml");
    }
    // Water is never unknown.
    expect(errors({ ...before, water_ml: null })).toHaveProperty("water_ml");
  });

  it("checks the servings like an entry edit, and they must be unchanged", () => {
    expect(errors({ ...before, amount: 0 })).toHaveProperty("amount");
    expect(errors({ ...before, amount: 25 }, { ...now, amount: 25 })).toHaveProperty("amount");
    expect(errors({ ...before, amount: "1.5" })).toHaveProperty("amount");
    // You changed it to 2 servings after the swap: the old copy is for 1.5.
    expect(errors(before, { ...now, amount: 2 })).toEqual({ entry: UNDO_CHANGED });
  });

  it("checks the meal, and it must be unchanged", () => {
    expect(errors({ ...before, meal: "brunch" })).toHaveProperty("meal");
    expect(errors(before, { ...now, meal: "dinner" })).toEqual({ entry: UNDO_CHANGED });
  });

  it("refuses a missing or too-long name and a recipe that isn't a uuid", () => {
    expect(errors({ ...before, name: "  " })).toHaveProperty("name");
    expect(errors({ ...before, name: "x".repeat(101) })).toHaveProperty("name");
    expect(errors({ ...before, recipe_id: "dal" })).toHaveProperty("recipe_id");
  });

  it("accepts exactly what swappedFrom sent after the swap", () => {
    const entry = {
      ...before,
      id: ENTRY_ID,
      day: "2026-11-09",
      meal: "lunch" as const,
      food_id: null,
      unit: "serving" as const,
    };
    const result = validateUndoSwap(swappedFrom(entry), now);
    expect(result.ok && result.value).toEqual(before);
  });

  it("refuses something that isn't an entry at all", () => {
    expect(errors(null)).toHaveProperty("entry");
    expect(errors("undo")).toHaveProperty("entry");
  });
});

describe("validateRestoredEntry", () => {
  const FOOD_ID = "9c8b7a6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
  // 150 g of rolled oats at breakfast, as the database sent it back.
  const deleted = {
    id: ENTRY_ID,
    day: "2026-11-15",
    meal: "breakfast",
    food_id: FOOD_ID,
    recipe_id: null,
    name: "Rolled oats",
    unit: "g",
    amount: 150,
    kcal: 568.5,
    protein_g: 19.5,
    carbs_g: 90,
    fat_g: 10,
    ...NO_EXTRAS,
    cost: 1.05,
    water_ml: 0,
    status: "eaten",
    created_at: "2026-11-15T08:01:02.123456+00:00",
  };
  const recipe = { ...deleted, food_id: null, recipe_id: RECIPE_ID, unit: "serving", amount: 1.5 };
  const errors = (raw: unknown) => {
    const result = validateRestoredEntry(raw);
    return result.ok ? null : result.fieldErrors;
  };

  it("accepts a deleted food entry and a recipe entry, unknowns and all", () => {
    const result = validateRestoredEntry(deleted);
    expect(result.ok && result.value).toEqual(deleted);
    expect(errors(recipe)).toBeNull();
    // Its food was deleted before it was: neither id. Unknown protein, cost.
    expect(errors({ ...deleted, food_id: null, protein_g: null, cost: null })).toBeNull();
    expect(errors({ ...deleted, created_at: "2026-11-15T08:01:02Z" })).toBeNull();
    // A recipe entry whose recipe was deleted: neither id, still servings.
    expect(errors({ ...recipe, recipe_id: null })).toBeNull();
  });

  it("keeps only the fields it checked, never someone else's user id", () => {
    const result = validateRestoredEntry({ ...deleted, user_id: "someone-else", extra: "x" });
    expect(result.ok && result.value).toEqual(deleted);
  });

  it("needs real ids, a real day, meal, status and time", () => {
    expect(errors({ ...deleted, id: "entry-1" })).toHaveProperty("id");
    expect(errors({ ...deleted, food_id: "rice" })).toHaveProperty("food_id");
    expect(errors({ ...recipe, recipe_id: 7 })).toHaveProperty("recipe_id");
    expect(errors({ ...deleted, day: "2026-02-30" })).toHaveProperty("day");
    expect(errors({ ...deleted, meal: "brunch" })).toHaveProperty("meal");
    expect(errors({ ...deleted, status: "maybe" })).toHaveProperty("status");
    expect(errors({ ...deleted, created_at: "yesterday" })).toHaveProperty("created_at");
    expect(errors({ ...deleted, created_at: 1731657662 })).toHaveProperty("created_at");
  });

  it("allows a food or a recipe, never both, with the matching unit", () => {
    expect(errors({ ...deleted, recipe_id: RECIPE_ID })).toHaveProperty("entry");
    expect(errors({ ...recipe, unit: "g" })).toHaveProperty("unit");
    expect(errors({ ...deleted, unit: "serving" })).toHaveProperty("unit");
    expect(errors({ ...deleted, unit: "kg" })).toHaveProperty("unit");
  });

  it("checks the name and amount like the database does", () => {
    expect(errors({ ...deleted, name: "  " })).toHaveProperty("name");
    expect(errors({ ...deleted, name: "x".repeat(101) })).toHaveProperty("name");
    expect(errors({ ...deleted, amount: 0 })).toHaveProperty("amount");
    expect(errors({ ...deleted, amount: "150" })).toHaveProperty("amount");
    expect(errors({ ...deleted, amount: 100001 })).toHaveProperty("amount");
    expect(errors({ ...recipe, amount: 25 })).toHaveProperty("amount");
  });

  it("refuses negative, text, NaN and Infinity numbers", () => {
    for (const bad of [-1, "19.5", Number.NaN, Number.POSITIVE_INFINITY, undefined]) {
      expect(errors({ ...deleted, protein_g: bad })).toHaveProperty("protein_g");
      expect(errors({ ...deleted, cost: bad })).toHaveProperty("cost");
      expect(errors({ ...deleted, water_ml: bad })).toHaveProperty("water_ml");
    }
    expect(errors({ ...deleted, water_ml: null })).toHaveProperty("water_ml");
  });

  it("refuses something that isn't an entry at all", () => {
    expect(errors(null)).toHaveProperty("entry");
    expect(errors("undo")).toHaveProperty("entry");
  });
});
