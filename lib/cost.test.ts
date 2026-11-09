import { describe, expect, it } from "vitest";
import { costOfAmount, formatMoney, pricePerUnit, unitPriceLabel } from "./cost";

describe("pricePerUnit", () => {
  it("divides price by package size", () => {
    // $3.50 for 500 g -> $0.007 per g
    expect(pricePerUnit(3.5, 500)).toBeCloseTo(0.007, 10);
  });

  it("keeps a free food at 0 (free is real, not an error)", () => {
    expect(pricePerUnit(0, 500)).toBe(0);
  });

  it("returns null for a package size of 0", () => {
    expect(pricePerUnit(3.5, 0)).toBeNull();
  });

  it("returns null for a negative package size", () => {
    expect(pricePerUnit(3.5, -500)).toBeNull();
  });

  it("returns null when price or size is not a number", () => {
    expect(pricePerUnit(NaN, 500)).toBeNull();
    expect(pricePerUnit(3.5, NaN)).toBeNull();
    expect(pricePerUnit(Infinity, 500)).toBeNull();
    expect(pricePerUnit(3.5, Infinity)).toBeNull();
  });
});

describe("unitPriceLabel", () => {
  it("shows grams per 100", () => {
    expect(unitPriceLabel(3.5, 500, "g")).toBe("$0.70 / 100 g");
  });

  it("shows 'each' items per item", () => {
    // $3 for 12 eggs -> $0.25 each
    expect(unitPriceLabel(3, 12, "each")).toBe("$0.25 each");
  });

  it("shows a dash when the price can't be calculated", () => {
    expect(unitPriceLabel(3.5, 0, "g")).toBe("—");
    expect(unitPriceLabel(NaN, 500, "ml")).toBe("—");
  });
});

describe("formatMoney", () => {
  it("shows extra decimals for tiny amounts", () => {
    expect(formatMoney(0.004)).toBe("$0.004");
  });

  it("shows normal amounts with 2 decimals", () => {
    expect(formatMoney(4.5)).toBe("$4.50");
  });

  it("shows a dash instead of $NaN", () => {
    expect(formatMoney(NaN)).toBe("—");
    expect(formatMoney(Infinity)).toBe("—");
  });
});

describe("real example: rice, $4.50 for 2 lb, 150 g per serving", () => {
  // The app has no "lb" unit, so convert by hand: 1 lb = 453.59237 g.
  const packageGrams = 2 * 453.59237; // 907.18 g
  const perGram = pricePerUnit(4.5, packageGrams)!; // 4.50 / 907.18 ≈ $0.00496 per g

  it("costs about $0.00496 per gram", () => {
    expect(perGram).toBeCloseTo(0.00496, 5);
  });

  it("shows $0.50 per 100 g", () => {
    // 100 x 0.00496 = $0.496 -> rounds to $0.50
    expect(unitPriceLabel(4.5, packageGrams, "g")).toBe("$0.50 / 100 g");
  });

  it("costs $0.74 per 150 g serving", () => {
    // 150 x 0.00496 = $0.744 -> rounds to $0.74
    expect(formatMoney(perGram * 150)).toBe("$0.74");
  });
});

describe("costOfAmount", () => {
  it("multiplies the amount by the price per unit", () => {
    // 150 g of a $3.50 / 500 g bag
    expect(costOfAmount(3.5, 500, 150)).toBeCloseTo(1.05, 10);
  });

  it("keeps a free food at a real $0", () => {
    expect(costOfAmount(0, 500, 150)).toBe(0);
  });

  it("returns null when the price can't be worked out, never $0", () => {
    expect(costOfAmount(3.5, 0, 150)).toBeNull();
    expect(costOfAmount(3.5, 500, Number.NaN)).toBeNull();
    expect(costOfAmount(3.5, 500, -1)).toBeNull();
  });
});
