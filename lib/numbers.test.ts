import { describe, expect, it } from "vitest";
import { numberOrNull, parseDecimal, sumOrNull } from "./numbers";

describe("numberOrNull", () => {
  it("keeps null as null, never 0", () => {
    expect(numberOrNull(null)).toBeNull();
    expect(numberOrNull(undefined)).toBeNull();
  });

  it("reads Postgres numeric strings and real zeros", () => {
    expect(numberOrNull("13.20")).toBe(13.2);
    expect(numberOrNull(0)).toBe(0);
  });
});

describe("parseDecimal", () => {
  it("reads normal numbers and a decimal comma", () => {
    expect(parseDecimal("150")).toBe(150);
    expect(parseDecimal(" 3.49 ")).toBe(3.49);
    expect(parseDecimal("3,49")).toBe(3.49);
    expect(parseDecimal("1,5")).toBe(1.5);
  });

  it("treats blank as null", () => {
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("  ")).toBeNull();
    expect(parseDecimal(null)).toBeNull();
  });

  it("refuses a comma before three digits, which could mean 1000 or 1", () => {
    expect(parseDecimal("1,000")).toBe("ambiguous");
    expect(parseDecimal("12,345")).toBe("ambiguous");
    expect(parseDecimal("1,000.5")).toBe("ambiguous");
  });

  it("rejects words and Infinity", () => {
    expect(parseDecimal("abc")).toBe("invalid");
    expect(parseDecimal("Infinity")).toBe("invalid");
  });
});

describe("sumOrNull", () => {
  it("adds up numbers, and real zeros count", () => {
    expect(sumOrNull([1, 2, 3])).toBe(6);
    expect(sumOrNull([0, 0])).toBe(0);
  });

  it("is unknown when ANY value is unknown, never a smaller sum", () => {
    expect(sumOrNull([1, null, 3])).toBeNull();
    expect(sumOrNull([1, Number.NaN])).toBeNull();
  });

  it("is unknown for an empty list (nothing yet isn't 0)", () => {
    expect(sumOrNull([])).toBeNull();
  });
});
