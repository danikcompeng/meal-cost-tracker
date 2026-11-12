import { describe, expect, it } from "vitest";
import { missingMacros, missingNote, offProductUrl, parseOffResponse } from "./open-food-facts";

// Shortened copies of real Open Food Facts replies.
const oats = {
  code: "5000112637922",
  status: 1,
  status_verbose: "product found",
  product: {
    product_name: "Rolled Oats",
    brands: "Quaker,PepsiCo",
    quantity: "1 kg",
    product_quantity: "1000",
    product_quantity_unit: "g",
    nutriments: {
      "energy-kcal_100g": 375,
      "energy-kj_100g": 1569,
      proteins_100g: 11,
      carbohydrates_100g: 60,
      fat_100g: 8,
      sugars_100g: 1.1,
      fiber_100g: 9,
      "saturated-fat_100g": 1.5,
      // Grams, as they always store it: 0.006 g = 6 mg.
      sodium_100g: 0.006,
      salt_100g: 0.015,
    },
  },
};

const notFound = { code: "1234567890128", status: 0, status_verbose: "product not found" };

describe("parseOffResponse", () => {
  it("reads a complete product", () => {
    expect(parseOffResponse(oats)).toEqual({
      name: "Rolled Oats",
      brand: "Quaker",
      unit: "g",
      packageSize: 1000,
      kcal: 375,
      protein_g: 11,
      carbs_g: 60,
      fat_g: 8,
      sugar_g: 1.1,
      fiber_g: 9,
      saturated_fat_g: 1.5,
      sodium_mg: 6,
      kcalFromKj: false,
      sodiumFromSalt: false,
    });
  });

  it("returns null when they don't have it", () => {
    expect(parseOffResponse(notFound)).toBeNull();
    expect(parseOffResponse(null)).toBeNull();
    expect(parseOffResponse("<html>")).toBeNull();
  });

  it("returns null for a product with no name and no nutrition", () => {
    expect(parseOffResponse({ status: 1, product: { brands: "Acme" } })).toBeNull();
  });

  it("leaves missing macros blank (null), never 0", () => {
    const draft = parseOffResponse({
      status: 1,
      product: {
        product_name: "Mystery bar",
        nutriments: { "energy-kcal_100g": 410, proteins_100g: 20, carbohydrates_100g: "", fat_100g: null },
      },
    });
    expect(draft?.carbs_g).toBeNull();
    expect(draft?.fat_g).toBeNull();
    expect(missingMacros(draft!)).toEqual(["carbs", "fat"]);
  });

  it("keeps a real 0 as 0", () => {
    const draft = parseOffResponse({
      status: 1,
      product: {
        product_name: "Diet cola",
        quantity: "330 ml",
        nutriments: { "energy-kcal_100g": 0.4, proteins_100g: 0, carbohydrates_100g: 0, fat_100g: 0 },
      },
    });
    expect(draft?.protein_g).toBe(0);
    expect(draft?.fat_g).toBe(0);
  });

  it("converts kJ to kcal when that's all they have", () => {
    const draft = parseOffResponse({
      status: 1,
      product: { product_name: "Rye bread", nutriments: { "energy-kj_100g": 1046, proteins_100g: 8.5 } },
    });
    // 1046 / 4.184 = 250
    expect(draft?.kcal).toBe(250);
    expect(draft?.kcalFromKj).toBe(true);
  });

  describe("sodium", () => {
    const withNutriments = (nutriments: Record<string, unknown>) =>
      parseOffResponse({ status: 1, product: { product_name: "Cereal", nutriments } });

    it("turns their grams into mg (real Cheerios reply: 0.487 g = 487 mg)", () => {
      const draft = withNutriments({ sodium_100g: 0.487179487179487, salt_100g: 1.21794871794872 });
      expect(draft?.sodium_mg).toBe(487);
      expect(draft?.sodiumFromSalt).toBe(false);
    });

    it("works it out from salt when that's all they have: salt g x 400", () => {
      // Salt = sodium x 2.5, so 1.5 g salt = 0.6 g = 600 mg sodium.
      const draft = withNutriments({ salt_100g: 1.5 });
      expect(draft?.sodium_mg).toBe(600);
      expect(draft?.sodiumFromSalt).toBe(true);
    });

    it("matches their own numbers (real Nutella reply: salt 0.107 g, sodium 0.0428 g)", () => {
      expect(withNutriments({ salt_100g: 0.107 })?.sodium_mg).toBe(43);
      expect(withNutriments({ sodium_100g: 0.0428 })?.sodium_mg).toBe(43);
    });

    it("leaves sodium blank when they have neither, and keeps a real 0", () => {
      expect(withNutriments({ proteins_100g: 3 })?.sodium_mg).toBeNull();
      expect(withNutriments({ sodium_100g: "" })?.sodium_mg).toBeNull();
      expect(withNutriments({ salt_100g: 0 })?.sodium_mg).toBe(0);
    });
  });

  it("leaves missing sugar, fiber and sat fat blank (null), never 0", () => {
    const draft = parseOffResponse({
      status: 1,
      product: { product_name: "Bar", nutriments: { sugars_100g: "12", fiber_100g: null } },
    });
    expect(draft).toMatchObject({ sugar_g: 12, fiber_g: null, saturated_fat_g: null });
  });

  it("treats plain energy_100g as kJ", () => {
    const draft = parseOffResponse({
      status: 1,
      product: { product_name: "Crackers", nutriments: { energy_100g: 2000 } },
    });
    expect(draft?.kcal).toBe(478); // 2000 / 4.184 = 478.01..., to 1 decimal
    expect(draft?.kcalFromKj).toBe(true);
  });

  it("measures liquids in ml", () => {
    const byUnit = parseOffResponse({
      status: 1,
      product: { product_name: "Milk", product_quantity: 1000, product_quantity_unit: "ml" },
    });
    expect(byUnit?.unit).toBe("ml");
    expect(byUnit?.packageSize).toBe(1000);

    const byLabel = parseOffResponse({
      status: 1,
      product: { product_name: "Orange juice", quantity: "1 L" },
    });
    expect(byLabel?.unit).toBe("ml");

    const cl = parseOffResponse({ status: 1, product: { product_name: "Water", quantity: "50 cl" } });
    expect(cl?.unit).toBe("ml");
  });

  it("measures everything else in g", () => {
    const draft = parseOffResponse({ status: 1, product: { product_name: "Lentils", quantity: "500 g" } });
    expect(draft?.unit).toBe("g");
  });

  it("drops package sizes that make no sense", () => {
    const zero = parseOffResponse({ status: 1, product: { product_name: "A", product_quantity: "0" } });
    expect(zero?.packageSize).toBeNull();
    const missing = parseOffResponse({ status: 1, product: { product_name: "A" } });
    expect(missing?.packageSize).toBeNull();
  });

  it("falls back to the English or generic name, and trims long names", () => {
    expect(
      parseOffResponse({ status: 1, product: { product_name: "  ", product_name_en: "Tofu " } })?.name,
    ).toBe("Tofu");
    expect(
      parseOffResponse({ status: 1, product: { generic_name: "Firm tofu" } })?.name,
    ).toBe("Firm tofu");
    const long = parseOffResponse({ status: 1, product: { product_name: "x".repeat(150) } });
    expect(long?.name).toHaveLength(100);
  });

  it("ignores negative numbers", () => {
    const draft = parseOffResponse({
      status: 1,
      product: { product_name: "Bad data", nutriments: { proteins_100g: -3 } },
    });
    expect(draft?.protein_g).toBeNull();
  });
});

describe("missingNote", () => {
  it("names what's missing in plain words", () => {
    expect(missingNote([])).toBeNull();
    expect(missingNote(["fat"])).toBe(
      "Open Food Facts doesn't list fat. Fill it in from the label, or leave it blank.",
    );
    expect(missingNote(["kcal", "carbs", "fat"])).toBe(
      "Open Food Facts doesn't list calories, carbs or fat. Fill them in from the label, or leave them blank.",
    );
  });
});

describe("offProductUrl", () => {
  it("asks only for the fields we use", () => {
    const url = offProductUrl("5000112637922");
    expect(url).toMatch(/^https:\/\/world\.openfoodfacts\.org\/api\/v2\/product\/5000112637922\.json\?fields=/);
    expect(url).toContain("nutriments");
  });
});
