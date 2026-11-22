// How nutrition numbers are SHOWN, in one place (CLAUDE.md, "Display
// rounding"). The maths and the database keep full precision; only the
// text on screen is rounded.
//
//   kcal   whole              652.9 -> "653"
//   g      whole from 10 g,   23.6 -> "24",  4.53 -> "4.5",  4.0 -> "4"
//          one decimal below
//   ml     whole              749.6 -> "750"
//   mg     whole              (sodium)
//
// Money has its own rule (2 decimals, formatMoney in lib/cost.ts), and
// amounts you typed (150 g, 1.5 servings) are shown as typed
// (amountText in lib/units.ts): they're your words, not a result.

export type DisplayUnit = "kcal" | "g" | "ml" | "mg";

const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const tenth = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

/** Grams keep one decimal below 10 g, where 4 g vs 5 g matters. */
function decimals(value: number, unit: DisplayUnit): 0 | 1 {
  return unit === "g" && Math.abs(value) < 10 ? 1 : 0;
}

/**
 * The number as the screen shows it, as a number: for comparisons that
 * must agree with the text (a ring is "reached" exactly when the text
 * says 140 of 140 g).
 */
export function roundForDisplay(value: number, unit: DisplayUnit): number {
  const factor = decimals(value, unit) === 1 ? 10 : 1;
  return Math.round(value * factor) / factor;
}

/**
 * The number as text: "1,240", "4.5". A little above 0 that would round
 * to 0 shows "<1" (or "<0.1" g), because "0" would claim there's none.
 */
export function formatNumber(value: number, unit: DisplayUnit): string {
  const shown = roundForDisplay(value, unit);
  if (value > 0 && shown === 0) return decimals(value, unit) === 1 ? "<0.1" : "<1";
  // Rounding 9.96 g gives 10: shown whole, like any other 10 g.
  const format = decimals(shown, unit) === 1 ? tenth : whole;
  // Math.abs(-0) and friends: never show "-0".
  return format.format(shown === 0 ? 0 : shown);
}
