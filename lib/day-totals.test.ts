import { describe, expect, it } from "vitest";
import { dayTotals, hasAnyExtra, missingNote, totalNumber } from "./day-totals";
import { NO_EXTRAS } from "./macros";

const full = {
  kcal: 500,
  protein_g: 30,
  carbs_g: 60,
  fat_g: 10,
  sugar_g: 5,
  fiber_g: 4,
  saturated_fat_g: 2,
  sodium_mg: 300,
  cost: 1.2,
};
/** A food saved before the extras existed. */
const old = { ...full, ...NO_EXTRAS };

describe("dayTotals", () => {
  it("adds up a normal day", () => {
    const totals = dayTotals([full, { ...full, kcal: 300, cost: 0.8 }]);
    expect(totals.count).toBe(2);
    expect(totals.kcal).toEqual({ sum: 800, missing: 0 });
    expect(totals.protein_g).toEqual({ sum: 60, missing: 0 });
    expect(totals.cost.sum).toBeCloseTo(2, 10);
  });

  it("never counts a missing value as 0: it's left out and counted as missing", () => {
    const totals = dayTotals([full, { ...full, kcal: null }]);
    expect(totals.kcal).toEqual({ sum: 500, missing: 1 });
    expect(totals.protein_g).toEqual({ sum: 60, missing: 0 });
  });

  it("shows — (null) when every entry is missing that value", () => {
    const totals = dayTotals([{ ...full, cost: null }, { ...full, cost: null }]);
    expect(totals.cost).toEqual({ sum: null, missing: 2 });
  });

  it("treats a real 0 as known, not missing", () => {
    const totals = dayTotals([{ ...full, fat_g: 0 }]);
    expect(totals.fat_g).toEqual({ sum: 0, missing: 0 });
  });

  it("an empty day is a real 0 (you ate nothing), with nothing missing", () => {
    const totals = dayTotals([]);
    expect(totals.count).toBe(0);
    expect(totals.kcal).toEqual({ sum: 0, missing: 0 });
  });

  it("adds up sugar, fiber, sat fat and sodium with the same missing count", () => {
    const totals = dayTotals([full, old, { ...full, sodium_mg: 0 }]);
    expect(totals.sugar_g).toEqual({ sum: 10, missing: 1 });
    expect(totals.sodium_mg).toEqual({ sum: 300, missing: 1 });
    expect(dayTotals([old, old]).fiber_g).toEqual({ sum: null, missing: 2 });
  });
});

describe("hasAnyExtra", () => {
  it("is true when at least one entry has one of the four", () => {
    expect(hasAnyExtra(dayTotals([old, { ...old, sodium_mg: 120 }]))).toBe(true);
    // A real 0 counts as known when every entry has it.
    expect(hasAnyExtra(dayTotals([{ ...old, fiber_g: 0 }]))).toBe(true);
  });

  it("is false when nothing is logged or no entry has any of them", () => {
    expect(hasAnyExtra(dayTotals([]))).toBe(false);
    expect(hasAnyExtra(dayTotals([old, old]))).toBe(false);
  });

  it("ignores water's 0s next to older foods, but shows a day that's all known", () => {
    const water = { ...old, sugar_g: 0, fiber_g: 0, saturated_fat_g: 0 };
    expect(hasAnyExtra(dayTotals([water, old]))).toBe(false);
    expect(hasAnyExtra(dayTotals([water, { ...old, fiber_g: 3 }]))).toBe(true);
    expect(hasAnyExtra(dayTotals([water]))).toBe(true);
  });
});

describe("totalNumber", () => {
  it("rounds to whole numbers with a thousands comma", () => {
    expect(totalNumber({ sum: 1239.6, missing: 0 })).toBe("1,240");
    expect(totalNumber({ sum: 0, missing: 0 })).toBe("0");
  });

  it("shows — when unknown", () => {
    expect(totalNumber({ sum: null, missing: 2 })).toBe("—");
  });
});

describe("missingNote", () => {
  it("says how many foods are missing a value", () => {
    expect(missingNote(1, "calories")).toBe("+ 1 food without calories");
    expect(missingNote(3, "a price")).toBe("+ 3 foods without a price");
  });

  it("says nothing when nothing is missing", () => {
    expect(missingNote(0, "calories")).toBeNull();
  });
});
