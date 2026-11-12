// A food that isn't saved yet: what the food form starts with after a scan.
// Pure, no React.

import type { FoodSource } from "./food-validation";
import { NO_EXTRAS, type Nutrients } from "./macros";
import type { OffDraft } from "./open-food-facts";
import type { BaseUnit } from "./units";

export type FoodDraft = Nutrients & {
  name: string | null;
  brand: string | null;
  unit: BaseUnit;
  packageSize: number | null;
  barcode: string | null;
  source: FoodSource;
  /** Calories were converted from kJ, so the form can say so. */
  kcalFromKj: boolean;
  /** Sodium was worked out from salt, so the form can say so. */
  sodiumFromSalt: boolean;
};

/** Open Food Facts found it: start from their numbers. */
export function draftFromOpenFoodFacts(barcode: string, off: OffDraft): FoodDraft {
  return { ...off, barcode, source: "open_food_facts" };
}

/**
 * Nothing found (or typed in by hand): an empty form, keeping the barcode
 * if there is one, so it's recognised next time you scan.
 */
export function emptyDraft(barcode: string | null): FoodDraft {
  return {
    name: null,
    brand: null,
    unit: "g",
    packageSize: null,
    kcal: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    ...NO_EXTRAS,
    barcode,
    source: "manual",
    kcalFromKj: false,
    sodiumFromSalt: false,
  };
}
