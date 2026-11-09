import { describe, expect, it } from "vitest";
import { dayTotals, missingNote, totalNumber } from "./day-totals";

const full = { kcal: 500, protein_g: 30, carbs_g: 60, fat_g: 10, cost: 1.2 };

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
