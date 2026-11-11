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
 */
export function macroText(value: number | null, unit: string, label?: string): string {
  if (value === null || !Number.isFinite(value)) return `— ${label ?? unit}`;
  const amount = `${amountFormat.format(value)} ${unit}`;
  return label ? `${amount} ${label}` : amount;
}

export function hasAnyMacro(m: Macros): boolean {
  return m.kcal !== null || m.protein_g !== null || m.carbs_g !== null || m.fat_g !== null;
}

/**
 * True when 0 kcal should fill in blank macros: calories are exactly 0, at
 * least one of protein / carbs / fat is blank, and every one you did type
 * is 0. If one is above 0 (0 kcal but 5 g protein), the numbers contradict
 * each other, so nothing is guessed: calorieHint flags it instead.
 */
export function zeroKcalFillsBlanks(m: Macros): boolean {
  const grams = [m.protein_g, m.carbs_g, m.fat_g];
  return m.kcal === 0 && grams.some((g) => g === null) && grams.every((g) => g === null || g === 0);
}

/**
 * Calories come from protein, carbs and fat (4, 4 and 9 kcal per gram), so
 * 0 kcal means all three are 0. Water saved as "0 kcal, macros blank"
 * would otherwise count as unknown and add "+ 1 unknown" to every total.
 * Blank stays blank (null) in every other case.
 */
export function fillZeroKcalMacros(m: Macros): Macros {
  if (!zeroKcalFillsBlanks(m)) return m;
  return {
    kcal: 0,
    protein_g: m.protein_g ?? 0,
    carbs_g: m.carbs_g ?? 0,
    fat_g: m.fat_g ?? 0,
  };
}

/**
 * Compares the calories you typed with what protein, carbs and fat imply
 * (4, 4 and 9 kcal per gram). Labels are often a little off because of
 * fiber or rounding, so only a gap above 20% (and more than 10 kcal, so tiny
 * numbers don't trigger it) gets a hint. The 20% is measured against the
 * larger of the two numbers, so it works the same whichever one is off.
 * It's advice and never blocks saving.
 */
export function calorieHint(m: Macros): string | null {
  const { kcal, protein_g, carbs_g, fat_g } = m;
  // 0 kcal with some protein, carbs or fat can't be right, even if a box is
  // still blank: those blanks won't be filled with 0, so say why.
  if (kcal === 0 && [protein_g, carbs_g, fat_g].some((g) => g !== null && g > 0)) {
    return "0 kcal doesn't fit protein, carbs or fat above 0. Check the label.";
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
