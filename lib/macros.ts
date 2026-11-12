// Pure helpers for calories and macros: no database, no React.
//
// A missing value is null and always shows as "—". It is never treated as 0,
// because "0 g protein" is a real claim about a food and "not entered" isn't.

import type { BaseUnit } from "./units";

export type Macros = {
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

/**
 * The quieter four, under "More nutrients". Same rules as the macros: per
 * basis amount, optional, null = not entered. Sodium is in mg, as on
 * labels; the rest in g.
 */
export type ExtraNutrients = {
  sugar_g: number | null;
  fiber_g: number | null;
  saturated_fat_g: number | null;
  sodium_mg: number | null;
};

export type Nutrients = Macros & ExtraNutrients;

export const MACRO_KEYS = ["kcal", "protein_g", "carbs_g", "fat_g"] as const;
export const EXTRA_KEYS = ["sugar_g", "fiber_g", "saturated_fat_g", "sodium_mg"] as const;
/** Every nutrient column, so scaling and adding up can loop over one list. */
export const NUTRIENT_KEYS = [...MACRO_KEYS, ...EXTRA_KEYS] as const;

/** A food with none of the extras entered (old foods, and tests). */
export const NO_EXTRAS: ExtraNutrients = {
  sugar_g: null,
  fiber_g: null,
  saturated_fat_g: null,
  sodium_mg: null,
};

/** Nutrition is stored per this much of the food: 100 g, 100 ml or 1 item. */
export function basisAmount(unit: BaseUnit): number {
  return unit === "each" ? 1 : 100;
}

/** "per 100 g", "per 100 ml" or "per 1 item". */
export function basisLabel(unit: BaseUnit): string {
  return unit === "each" ? "per 1 item" : `per ${basisAmount(unit)} ${unit}`;
}

const amountFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

/**
 * One macro as text: macroText(13, "g", "protein") -> "13 g protein",
 * macroText(350, "kcal") -> "350 kcal". A missing value keeps its label so
 * you can still tell which one is missing: "— protein", "— kcal".
 * Above 0 but under 0.05: "<0.1 g protein".
 */
export function macroText(value: number | null, unit: string, label?: string): string {
  if (value === null || !Number.isFinite(value)) return `— ${label ?? unit}`;
  // A little that rounds down to 0 ("0.03 g") shows "<0.1 g", because
  // "0 g" would claim there's none at all.
  const shown = value > 0 && Math.round(value * 10) === 0 ? "<0.1" : amountFormat.format(value);
  const amount = `${shown} ${unit}`;
  return label ? `${amount} ${label}` : amount;
}

export function hasAnyMacro(m: Macros): boolean {
  return m.kcal !== null || m.protein_g !== null || m.carbs_g !== null || m.fat_g !== null;
}

/**
 * The nutrients 0 kcal says something about: protein, carbs and fat, and
 * the parts of them (sugar and fiber are carbs, saturated fat is fat).
 * NOT sodium: salt has no calories (0 kcal, about 39,000 mg sodium per
 * 100 g), so 0 kcal tells us nothing about sodium.
 */
const CALORIE_KEYS = ["protein_g", "carbs_g", "fat_g", "sugar_g", "fiber_g", "saturated_fat_g"] as const;

/**
 * True when 0 kcal should fill in blanks: calories are exactly 0, at least
 * one of the CALORIE_KEYS is blank, and every one you did type is 0. If one
 * is above 0 (0 kcal but 5 g protein), the numbers contradict each other,
 * so nothing is guessed: calorieHint flags it instead. Sodium doesn't
 * count either way, so salt (0 kcal, lots of sodium) still gets its 0s.
 */
export function zeroKcalFillsBlanks(m: Nutrients): boolean {
  const grams = CALORIE_KEYS.map((key) => m[key]);
  return m.kcal === 0 && grams.some((g) => g === null) && grams.every((g) => g === null || g === 0);
}

/**
 * Calories come from protein, carbs and fat (4, 4 and 9 kcal per gram), so
 * 0 kcal means all of them, and their parts, are 0. Water saved as "0 kcal,
 * macros blank" would otherwise count as unknown and add "+ 1 unknown" to
 * every total. Sodium stays as it is. Blank stays blank (null) in every
 * other case.
 */
export function fillZeroKcalMacros(m: Nutrients): Nutrients {
  if (!zeroKcalFillsBlanks(m)) return m;
  const filled = { ...m, kcal: 0 };
  for (const key of CALORIE_KEYS) filled[key] = m[key] ?? 0;
  return filled;
}

/**
 * Compares the calories you typed with what protein, carbs and fat imply
 * (4, 4 and 9 kcal per gram). Labels are often a little off because of
 * fiber or rounding, so only a gap above 20% (and more than 10 kcal, so tiny
 * numbers don't trigger it) gets a hint. The 20% is measured against the
 * larger of the two numbers, so it works the same whichever one is off.
 * It's advice and never blocks saving.
 */
export function calorieHint(m: Macros & Partial<ExtraNutrients>): string | null {
  const { kcal, protein_g, carbs_g, fat_g } = m;
  // 0 kcal with some protein, carbs or fat can't be right, even if a box is
  // still blank: those blanks won't be filled with 0, so say why.
  const above0 = (g: number | null | undefined) => g != null && g > 0;
  if (kcal === 0 && [protein_g, carbs_g, fat_g].some(above0)) {
    return "0 kcal doesn't fit protein, carbs or fat above 0. Check the label.";
  }
  if (kcal === 0 && [m.sugar_g, m.fiber_g, m.saturated_fat_g].some(above0)) {
    return "0 kcal doesn't fit sugar, fiber or sat fat above 0. Check the label.";
  }
  if (kcal === null || protein_g === null || carbs_g === null || fat_g === null) return null;

  const estimate = kcalFromMacros(protein_g, carbs_g, fat_g);
  if (!kcalGapTooBig(kcal, estimate)) return null;

  const direction = kcal > estimate ? "high" : "low";
  return `Calories look ${direction} for these macros (about ${Math.round(estimate)} kcal expected). Check the label.`;
}

/** Calories implied by protein, carbs and fat: 4, 4 and 9 kcal per gram. */
export function kcalFromMacros(protein_g: number, carbs_g: number, fat_g: number): number {
  return 4 * protein_g + 4 * carbs_g + 9 * fat_g;
}

/**
 * True when calories and the 4/4/9 estimate are too far apart to be label
 * rounding: more than 10 kcal AND more than 20% of the larger number. Used
 * by both the food form and the daily targets form, so they agree.
 */
export function kcalGapTooBig(kcal: number, estimate: number): boolean {
  const gap = Math.abs(kcal - estimate);
  return gap > 10 && gap > 0.2 * Math.max(kcal, estimate);
}

/**
 * Each macro you typed belongs to the unit that was picked at the time. If
 * the unit changes afterwards (e.g. from g to each), the same numbers now
 * mean "per 1 item" instead of "per 100 g", which is a very different food.
 *
 * `enteredFor` lists the unit each filled-in macro was typed for. The note
 * stays until every one of them has been looked at again for the current
 * unit: fixing only Calories doesn't make the other three right.
 */
export function basisChangeNote(enteredFor: BaseUnit[], current: BaseUnit): string | null {
  const stale = enteredFor.find((unit) => unit !== current);
  if (stale === undefined) return null;
  return `These numbers were entered ${basisLabel(stale)}. They now count ${basisLabel(current)}, so check them against the label.`;
}
