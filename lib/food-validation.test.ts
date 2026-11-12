import { describe, expect, it } from "vitest";
import { parseSource, validateFood, validateMacros } from "./food-validation";
import { NO_EXTRAS } from "./macros";

describe("parseSource", () => {
  it("keeps a known source and treats anything else as manual", () => {
    expect(parseSource("open_food_facts")).toBe("open_food_facts");
    expect(parseSource("label_photo")).toBe("label_photo");
    expect(parseSource(null)).toBe("manual");
    expect(parseSource("hacker")).toBe("manual");
  });
});

const valid = { name: "Rolled oats", price: "3.49", packageSize: "500", unit: "g" };

describe("validateFood", () => {
  it("accepts a normal food and trims the name", () => {
    const result = validateFood({ ...valid, name: "  Rolled oats  " });
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Rolled oats",
        // No brand or barcode sent: both null, not "".
        brand: null,
        barcode: null,
        price: 3.49,
        package_size: 500,
        unit: "g",
        // No macros sent: they come back as null ("not entered"), not 0.
        kcal: null,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
        ...NO_EXTRAS,
      },
    });
  });

  it("trims the brand and saves a blank brand as null", () => {
    const quaker = validateFood({ ...valid, brand: "  Quaker " });
    expect(quaker.ok && quaker.value.brand).toBe("Quaker");
    const blank = validateFood({ ...valid, brand: "   " });
    expect(blank.ok && blank.value.brand).toBeNull();
    const long = validateFood({ ...valid, brand: "x".repeat(101) });
    expect(!long.ok && long.fieldErrors.brand).toMatch(/under 100/);
  });

  it("saves a barcode in the standard 13-digit form", () => {
    const upcA = validateFood({ ...valid, barcode: "036000291452" });
    expect(upcA.ok && upcA.value.barcode).toBe("0036000291452");
    const none = validateFood({ ...valid, barcode: "" });
    expect(none.ok && none.value.barcode).toBeNull();
  });

  it("refuses a barcode with a wrong check digit", () => {
    const result = validateFood({ ...valid, barcode: "5000112637923" });
    expect(!result.ok && result.fieldErrors.barcode).toMatch(/doesn't look right/);
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

  it("rejects a size that would be saved as 0.000, with a clear message", () => {
    // The database keeps 3 decimals: 0.0001 g would become 0.000.
    const tiny = validateFood({ ...valid, packageSize: "0.0001" });
    expect(!tiny.ok && tiny.fieldErrors.packageSize).toMatch(/too small/);
    // 0.001 g is the smallest size that survives.
    expect(validateFood({ ...valid, packageSize: "0.001" }).ok).toBe(true);
    // Checked after converting: 0.0001 kg is 0.1 g, which is fine.
    expect(validateFood({ ...valid, unit: "kg", packageSize: "0.0001" }).ok).toBe(true);
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
      ...NO_EXTRAS,
    });
  });

  it("keeps a typed 0 as a real 0", () => {
    // kcal 5, not 0, so the 0 kcal rule below doesn't fill the blanks.
    expect(ok({ kcal: "5", fat: "0" })).toMatchObject({ kcal: 5, fat_g: 0, protein_g: null });
  });

  describe("0 kcal means no protein, carbs or fat", () => {
    // Sugar, fiber and sat fat are parts of carbs and fat, so they're 0 too.
    // Sodium isn't: salt has no calories, so it stays blank.
    const zeros = {
      kcal: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      sugar_g: 0,
      fiber_g: 0,
      saturated_fat_g: 0,
      sodium_mg: null,
    };

    it("saves blank macros as 0 when kcal is 0 (water)", () => {
      const result = validateMacros({ kcal: "0" }, "ml");
      expect(result.value).toEqual(zeros);
      expect(result.filledBlanks).toBe(true);
    });

    it("also fills the rest when the macros you typed are 0", () => {
      expect(ok({ kcal: "0", protein: "0" })).toEqual(zeros);
    });

    it("counts kcal that rounds to 0 as 0, but not kcal that rounds to 0.1", () => {
      expect(ok({ kcal: "0.04" })).toEqual(zeros);
      expect(ok({ kcal: "0.05" })).toEqual({
        kcal: 0.1,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
        ...NO_EXTRAS,
      });
    });

    it("fills only the boxes that are blank", () => {
      const result = validateMacros({ kcal: "0", protein: "0", carbs: "0" }, "g");
      expect(result.value).toEqual(zeros);
      expect(result.filledBlanks).toBe(true);
    });

    it("doesn't guess when a typed macro contradicts 0 kcal", () => {
      const result = validateMacros({ kcal: "0", protein: "5" }, "g");
      expect(result.value).toEqual({ kcal: 0, protein_g: 5, carbs_g: null, fat_g: null, ...NO_EXTRAS });
      expect(result.filledBlanks).toBe(false);
    });

    it("doesn't guess when typed sugar, fiber or sat fat contradicts 0 kcal", () => {
      for (const raw of [{ kcal: "0", sugar: "3" }, { kcal: "0", fiber: "1" }, { kcal: "0", saturatedFat: "2" }]) {
        const result = validateMacros(raw, "g");
        expect(result.filledBlanks).toBe(false);
        expect(result.value.protein_g).toBeNull();
      }
    });

    it("leaves sodium out of the rule both ways: salt is 0 kcal with lots of sodium", () => {
      const salt = validateMacros({ kcal: "0", sodium: "38758" }, "g");
      expect(salt.filledBlanks).toBe(true);
      expect(salt.value).toEqual({ ...zeros, sodium_mg: 38758 });
      // And 0 kcal never makes up a sodium value.
      expect(validateMacros({ kcal: "0" }, "ml").value.sodium_mg).toBeNull();
    });

    it("keeps blanks null when kcal is above 0 or blank", () => {
      expect(ok({ kcal: "5" })).toMatchObject({ protein_g: null, carbs_g: null, fat_g: null, ...NO_EXTRAS });
      expect(ok({})).toEqual({ kcal: null, protein_g: null, carbs_g: null, fat_g: null, ...NO_EXTRAS });
    });

    it("still fills the extras when only the main four are typed", () => {
      const result = validateMacros({ kcal: "0", protein: "0", carbs: "0", fat: "0" }, "g");
      expect(result.value).toEqual(zeros);
      expect(result.filledBlanks).toBe(true);
    });

    it("has nothing to fill when every gram box is typed", () => {
      const result = validateMacros(
        { kcal: "0", protein: "0", carbs: "0", fat: "0", sugar: "0", fiber: "0", saturatedFat: "0" },
        "g",
      );
      expect(result.value).toEqual(zeros);
      expect(result.filledBlanks).toBe(false);
    });

    it("doesn't fill while another box has a mistake in it", () => {
      for (const raw of [{ kcal: "0", protein: "abc" }, { kcal: "0", fat: "2000" }]) {
        const result = validateMacros(raw, "each");
        expect(Object.keys(result.fieldErrors)).toHaveLength(1);
        expect(result.filledBlanks).toBe(false);
      }
    });

    it("saves the filled zeros through validateFood too", () => {
      const result = validateFood({
        name: "Water",
        price: "0",
        packageSize: "1",
        unit: "l",
        kcal: "0",
      });
      expect(result.ok && result.value).toMatchObject(zeros);
    });
  });

  it("allows some macros filled and others missing", () => {
    expect(ok({ protein: "25" })).toEqual({
      kcal: null,
      protein_g: 25,
      carbs_g: null,
      fat_g: null,
      ...NO_EXTRAS,
    });
  });

  describe("more nutrients", () => {
    it("saves sugar, fiber and sat fat to 0.1 g and sodium to whole mg", () => {
      expect(ok({ carbs: "60", fat: "8", sugar: "1,25", fiber: "10.04", saturatedFat: "1.5", sodium: "6.6" })).toMatchObject({
        sugar_g: 1.3,
        fiber_g: 10,
        saturated_fat_g: 1.5,
        sodium_mg: 7,
      });
    });

    it("treats blank as null and 0 as a real 0", () => {
      expect(ok({ sugar: "", fiber: "0", sodium: " " })).toMatchObject({
        sugar_g: null,
        fiber_g: 0,
        sodium_mg: null,
      });
    });

    it("refuses sugar above carbs and sat fat above fat, for any unit", () => {
      for (const unit of ["g", "ml", "each"] as const) {
        const result = validateMacros({ carbs: "10", sugar: "10.1", fat: "5", saturatedFat: "6" }, unit);
        expect(Object.keys(result.fieldErrors).sort()).toEqual(["saturatedFat", "sugar"]);
      }
      expect(validateMacros({ carbs: "10", sugar: "10", fat: "5", saturatedFat: "5" }, "g").fieldErrors).toEqual({});
      // Nothing to compare with when carbs or fat is blank.
      expect(validateMacros({ sugar: "10", saturatedFat: "6" }, "g").fieldErrors).toEqual({});
    });

    it("doesn't compare fiber with carbs (US labels count it inside, EU don't)", () => {
      expect(validateMacros({ carbs: "5", fiber: "8" }, "g").fieldErrors).toEqual({});
    });

    it("keeps sugar, fiber and sat fat out of the 100 g sum (they're inside carbs and fat)", () => {
      const result = validateMacros({ protein: "10", carbs: "60", fat: "30", sugar: "50", saturatedFat: "20" }, "g");
      expect(result.fieldErrors).toEqual({});
    });

    it("per 100 g: at most 100 g each, and sodium at most pure salt", () => {
      expect(validateMacros({ fiber: "100.1" }, "g").fieldErrors.fiber).toBeTruthy();
      expect(validateMacros({ sodium: "39400" }, "g").fieldErrors).toEqual({});
      expect(validateMacros({ sodium: "39401" }, "g").fieldErrors.sodium).toBeTruthy();
      // An "each" food can be big (a whole pizza): only the loose limit.
      expect(validateMacros({ sodium: "50000" }, "each").fieldErrors).toEqual({});
      expect(validateMacros({ sodium: "100001" }, "each").fieldErrors.sodium).toBeTruthy();
    });

    it("rejects words, negatives and an ambiguous comma in grams", () => {
      expect(validateMacros({ sugar: "lots" }, "g").fieldErrors.sugar).toBeTruthy();
      expect(validateMacros({ sodium: "-5" }, "g").fieldErrors.sodium).toBeTruthy();
      expect(validateMacros({ fiber: "1,200" }, "each").fieldErrors.fiber).toMatch(/comma/);
    });

    it("reads a thousands comma in sodium as thousands (whole mg, like '1,170 mg')", () => {
      expect(ok({ sodium: "1,170" }, "each").sodium_mg).toBe(1170);
      expect(ok({ sodium: "12,500" }, "each").sodium_mg).toBe(12500);
      // Not a thousands pattern: the usual decimal-comma rule.
      expect(ok({ sodium: "1,5" }, "each").sodium_mg).toBe(2);
    });

    it("saves them through validateFood", () => {
      const result = validateFood({ ...valid, carbs: "60", sugar: "1", sodium: "6" });
      expect(result.ok && result.value).toMatchObject({ sugar_g: 1, fiber_g: null, sodium_mg: 6 });
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
