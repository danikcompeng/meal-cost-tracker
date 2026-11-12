// Turning an Open Food Facts reply into a food draft. Pure functions: the
// actual network request is in lib/scan-actions.ts.
//
// Open Food Facts is a free, volunteer-made database of packaged food. Its
// data is usually right but not always, so everything here is a DRAFT that
// you check against the label before saving.
//
// Missing stays missing: a value they don't have becomes null (a blank box),
// never 0. A 0 they DO have (diet soda: 0 g fat) stays 0.

import type { Macros } from "./macros";

/** Who we are, sent with every request, as Open Food Facts asks apps to do. */
export const OFF_USER_AGENT = "MealCostTracker/0.1 (https://meal-cost-tracker.vercel.app)";

// Only ask for the fields we use: the full product is often 100 KB+.
const FIELDS = [
  "product_name",
  "product_name_en",
  "generic_name",
  "brands",
  "quantity",
  "product_quantity",
  "product_quantity_unit",
  "nutriments",
].join(",");

export function offProductUrl(barcode: string): string {
  return `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${FIELDS}`;
}

export type OffDraft = Macros & {
  name: string | null;
  brand: string | null;
  /** Their nutrition is per 100 g or per 100 ml; never "each". */
  unit: "g" | "ml";
  packageSize: number | null;
  /** True when calories were worked out from kJ (they only had kJ). */
  kcalFromKj: boolean;
};

export const KJ_PER_KCAL = 4.184;

/**
 * Reads their reply. Returns null when they don't have the product, or
 * have it with nothing useful (no name and no nutrition at all).
 */
export function parseOffResponse(json: unknown): OffDraft | null {
  if (!isObject(json) || json.status !== 1 || !isObject(json.product)) return null;
  const product = json.product;
  const n = isObject(product.nutriments) ? product.nutriments : {};

  const name = text(product.product_name) ?? text(product.product_name_en) ?? text(product.generic_name);
  const brand = firstBrand(product.brands);

  // Calories: kcal if they list it. Many European products list only kJ
  // (kilojoules, another unit for energy): 1 kcal = 4.184 kJ. "energy_100g"
  // on its own is in kJ too.
  let kcal = amount(n["energy-kcal_100g"]);
  let kcalFromKj = false;
  if (kcal === null) {
    const kj = amount(n["energy-kj_100g"]) ?? amount(n["energy_100g"]);
    if (kj !== null) {
      kcal = Math.round((kj / KJ_PER_KCAL) * 10) / 10;
      kcalFromKj = true;
    }
  }

  const draft: OffDraft = {
    name,
    brand,
    unit: isLiquid(product) ? "ml" : "g",
    packageSize: packageSize(product.product_quantity),
    kcal,
    protein_g: amount(n.proteins_100g),
    carbs_g: amount(n.carbohydrates_100g),
    fat_g: amount(n.fat_100g),
    kcalFromKj,
  };

  const hasNutrition = [draft.kcal, draft.protein_g, draft.carbs_g, draft.fat_g].some(
    (v) => v !== null,
  );
  return name === null && !hasNutrition ? null : draft;
}

/** Which of calories, protein, carbs and fat they didn't have. */
export function missingMacros(draft: Macros): ("kcal" | "protein" | "carbs" | "fat")[] {
  const missing: ("kcal" | "protein" | "carbs" | "fat")[] = [];
  if (draft.kcal === null) missing.push("kcal");
  if (draft.protein_g === null) missing.push("protein");
  if (draft.carbs_g === null) missing.push("carbs");
  if (draft.fat_g === null) missing.push("fat");
  return missing;
}

const MISSING_NAMES = { kcal: "calories", protein: "protein", carbs: "carbs", fat: "fat" };

/** "Open Food Facts doesn't list carbs or fat. ..." or null if nothing's missing. */
export function missingNote(missing: ("kcal" | "protein" | "carbs" | "fat")[]): string | null {
  if (missing.length === 0) return null;
  const names = missing.map((m) => MISSING_NAMES[m]);
  const list =
    names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`;
  return `Open Food Facts doesn't list ${list}. Fill ${missing.length === 1 ? "it" : "them"} in from the label, or leave ${missing.length === 1 ? "it" : "them"} blank.`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A trimmed name up to 100 characters (our limit), or null if empty. */
function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim().replace(/\s+/g, " ");
  return s === "" ? null : s.slice(0, 100).trim();
}

// "Quaker,PepsiCo" -> "Quaker". The first brand is the one on the front.
function firstBrand(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return text(value.split(",")[0]);
}

// Numbers can arrive as 13 or as "13". Careful: Number("") and Number(null)
// are both 0 in JavaScript, which would turn "not listed" into a fake 0.
function amount(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  return null;
}

// Their product_quantity is already in g or ml ("500" for a 0.5 kg bag).
function packageSize(value: unknown): number | null {
  const n = amount(value);
  return n !== null && n > 0 && n <= 100000 ? n : null;
}

// Liquids are measured in ml. They say so in product_quantity_unit, or
// only in the label text ("1 L", "330 ml", "50 cl").
function isLiquid(product: Record<string, unknown>): boolean {
  const unit = typeof product.product_quantity_unit === "string" ? product.product_quantity_unit : "";
  if (/^\s*ml\s*$/i.test(unit)) return true;
  if (/^\s*g\s*$/i.test(unit)) return false;
  const quantity = typeof product.quantity === "string" ? product.quantity : "";
  return /\d\s*(ml|cl|dl|l|fl\.?\s?oz)\b/i.test(quantity);
}
