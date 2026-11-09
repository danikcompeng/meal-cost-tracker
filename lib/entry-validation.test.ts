import { describe, expect, it } from "vitest";
import { validateEntryChange, validateNewEntry } from "./entry-validation";

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
});
