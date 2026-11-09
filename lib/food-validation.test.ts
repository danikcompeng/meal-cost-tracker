import { describe, expect, it } from "vitest";
import { validateFood } from "./food-validation";

const valid = { name: "Rolled oats", price: "3.49", packageSize: "500", unit: "g" };

describe("validateFood", () => {
  it("accepts a normal food and trims the name", () => {
    const result = validateFood({ ...valid, name: "  Rolled oats  " });
    expect(result).toEqual({
      ok: true,
      value: { name: "Rolled oats", price: 3.49, package_size: 500, unit: "g" },
    });
  });

  it("converts kg to g and l to ml", () => {
    const kg = validateFood({ ...valid, packageSize: "1.5", unit: "kg" });
    expect(kg.ok && kg.value).toMatchObject({ package_size: 1500, unit: "g" });

    const l = validateFood({ ...valid, packageSize: "2", unit: "l" });
    expect(l.ok && l.value).toMatchObject({ package_size: 2000, unit: "ml" });
  });

  it("accepts a comma as the decimal point", () => {
    const result = validateFood({ ...valid, price: "3,49" });
    expect(result.ok && result.value.price).toBe(3.49);
  });

  it("rounds the price to cents", () => {
    const result = validateFood({ ...valid, price: "3.456" });
    expect(result.ok && result.value.price).toBe(3.46);
  });

  it("allows a price of 0 (free is real)", () => {
    expect(validateFood({ ...valid, price: "0" }).ok).toBe(true);
  });

  it("rejects an empty or blank name", () => {
    for (const name of ["", "   "]) {
      const result = validateFood({ ...valid, name });
      expect(!result.ok && result.fieldErrors.name).toBeTruthy();
    }
  });

  it("accepts exactly 100 characters but rejects 101", () => {
    expect(validateFood({ ...valid, name: "a".repeat(100) }).ok).toBe(true);
    const result = validateFood({ ...valid, name: "a".repeat(101) });
    expect(!result.ok && result.fieldErrors.name).toBeTruthy();
  });

  // Number("Infinity") is a valid number in JavaScript, so it needs its own test.
  it("rejects a negative, missing, non-number or infinite price", () => {
    for (const price of ["-1", "", "abc", "Infinity"]) {
      const result = validateFood({ ...valid, price });
      expect(!result.ok && result.fieldErrors.price).toBeTruthy();
    }
  });

  it("rejects a package size of 0, negative, missing or infinite", () => {
    for (const packageSize of ["0", "-500", "", "Infinity"]) {
      const result = validateFood({ ...valid, packageSize });
      expect(!result.ok && result.fieldErrors.packageSize).toBeTruthy();
    }
  });

  it("rejects a unit it doesn't know", () => {
    const result = validateFood({ ...valid, unit: "cups" });
    expect(!result.ok && result.fieldErrors.unit).toBeTruthy();
  });

  it("shows an error on every field when all are missing", () => {
    const result = validateFood({ name: null, price: null, packageSize: null, unit: null });
    expect(!result.ok && Object.keys(result.fieldErrors).sort()).toEqual([
      "name",
      "packageSize",
      "price",
      "unit",
    ]);
  });
});
