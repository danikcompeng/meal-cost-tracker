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
 * Compares the calories you typed with what protein, carbs and fat imply
 * (4, 4 and 9 kcal per gram). Labels are often a little off because of
 * fiber or rounding, so only a gap above 20% (and more than 10 kcal, so tiny
 * numbers don't trigger it) gets a hint. The 20% is measured against the
 * larger of the two numbers, so it works the same whichever one is off.
 * It's advice and never blocks saving.
 */
export function calorieHint(m: Macros): string | null {
  const { kcal, protein_g, carbs_g, fat_g } = m;
  if (kcal === null || protein_g === null || carbs_g === null || fat_g === null) return null;

  const estimate = 4 * protein_g + 4 * carbs_g + 9 * fat_g;
  const gap = kcal - estimate;
  if (Math.abs(gap) <= 10 || Math.abs(gap) <= 0.2 * Math.max(kcal, estimate)) return null;

  const direction = gap > 0 ? "high" : "low";
  return `Calories look ${direction} for these macros (about ${Math.round(estimate)} kcal expected). Check the label.`;
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
