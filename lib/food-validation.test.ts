import { describe, expect, it } from "vitest";
import { validateFood, validateMacros } from "./food-validation";

const valid = { name: "Rolled oats", price: "3.49", packageSize: "500", unit: "g" };

describe("validateFood", () => {
  it("accepts a normal food and trims the name", () => {
    const result = validateFood({ ...valid, name: "  Rolled oats  " });
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Rolled oats",
        price: 3.49,
        package_size: 500,
        unit: "g",
        // No macros sent: they come back as null ("not entered"), not 0.
        kcal: null,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
      },
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

  it("asks for no comma when 1,000 could mean 1000 or 1", () => {
    const result = validateFood({ ...valid, packageSize: "1,000", price: "1,234" });
    expect(!result.ok && result.fieldErrors.packageSize).toMatch(/without a comma/);
    expect(!result.ok && result.fieldErrors.price).toMatch(/without a comma/);
    const macro = validateMacros({ kcal: "1,200" }, "each");
    expect(macro.fieldErrors.kcal).toMatch(/without a comma/);
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

describe("validateFood with macros", () => {
  const oats = { ...valid, kcal: "379", protein: "13.2", carbs: "60", fat: "7" };

  it("saves macros as numbers", () => {
    const result = validateFood(oats);
    expect(result.ok && result.value).toMatchObject({
      kcal: 379,
      protein_g: 13.2,
      carbs_g: 60,
      fat_g: 7,
    });
  });

  it("keeps the old food working: no macros at all is fine", () => {
    expect(validateFood(valid).ok).toBe(true);
  });

  it("sends macro errors back with the other field errors", () => {
    const result = validateFood({ ...oats, protein: "-1", price: "" });
    expect(!result.ok && Object.keys(result.fieldErrors).sort()).toEqual(["price", "protein"]);
  });

  it("checks per-100 g rules after converting kg to g", () => {
    const result = validateFood({ ...oats, unit: "kg", packageSize: "1", protein: "120" });
    expect(!result.ok && result.fieldErrors.protein).toBeTruthy();
  });
});

describe("validateMacros", () => {
  const ok = (raw: Parameters<typeof validateMacros>[0], unit: "g" | "ml" | "each" = "g") => {
    const result = validateMacros(raw, unit);
    expect(result.fieldErrors).toEqual({});
    return result.value;
  };

  it("treats blank, whitespace and missing as null, never 0", () => {
    expect(ok({ kcal: "", protein: "   ", carbs: null })).toEqual({
      kcal: null,
      protein_g: null,
      carbs_g: null,
      fat_g: null,
    });
  });

  it("keeps a typed 0 as a real 0", () => {
    expect(ok({ kcal: "0", fat: "0" })).toMatchObject({ kcal: 0, fat_g: 0, protein_g: null });
  });

  it("allows some macros filled and others missing", () => {
    expect(ok({ protein: "25" })).toEqual({
      kcal: null,
      protein_g: 25,
      carbs_g: null,
      fat_g: null,
    });
  });

  it("accepts a comma and rounds to 1 decimal", () => {
    expect(ok({ protein: "12,34", fat: "0.05" })).toMatchObject({ protein_g: 12.3, fat_g: 0.1 });
  });

  it("rejects negatives, words and Infinity", () => {
    for (const bad of ["-1", "-0.01", "abc", "Infinity"]) {
      const result = validateMacros({ protein: bad }, "g");
      expect(result.fieldErrors.protein).toBeTruthy();
      expect(result.value.protein_g).toBeNull();
    }
  });

  describe("per 100 g", () => {
    it("allows exactly 900 kcal but not 901", () => {
      expect(validateMacros({ kcal: "900" }, "g").fieldErrors).toEqual({});
      expect(validateMacros({ kcal: "901" }, "g").fieldErrors.kcal).toBeTruthy();
    });

    it("rejects one macro over 100 g", () => {
      expect(validateMacros({ fat: "100.1" }, "g").fieldErrors.fat).toBeTruthy();
      expect(validateMacros({ fat: "100" }, "g").fieldErrors).toEqual({});
    });

    it("rejects protein + carbs + fat over 100 g", () => {
      const result = validateMacros({ protein: "40", carbs: "40", fat: "21" }, "g");
      expect(result.fieldErrors.macros).toBeTruthy();
    });

    it("allows a sum of exactly 100 despite decimal rounding", () => {
      // 33.3 + 33.3 + 33.4 is 100.00000000000001 in JavaScript.
      ok({ protein: "33.3", carbs: "33.3", fat: "33.4" });
    });
  });

  it("doesn't apply the per-100 g rules to ml (honey has ~116 g carbs per 100 ml)", () => {
    expect(ok({ kcal: "430", carbs: "116" }, "ml")).toMatchObject({ carbs_g: 116 });
  });

  it("doesn't apply the per-100 g rules to each (a whole pizza)", () => {
    expect(ok({ kcal: "2200", protein: "90", carbs: "250", fat: "90" }, "each")).toMatchObject({
      kcal: 2200,
    });
  });

  it("still catches obvious typos for every unit, matching the database", () => {
    expect(validateMacros({ kcal: "10001" }, "each").fieldErrors.kcal).toBeTruthy();
    expect(validateMacros({ protein: "1001" }, "ml").fieldErrors.protein).toBeTruthy();
    expect(validateMacros({ kcal: "10000", protein: "1000" }, "each").fieldErrors).toEqual({});
  });
});
