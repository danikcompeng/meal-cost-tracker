// Hydration: how much water you drank. Pure functions.
//
// Only foods measured in ml can count, because then the amount you log
// IS the water in ml (250 ml of water = 250 ml toward hydration).

import type { BaseUnit } from "./units";

/**
 * The switch starts on for a new food with the word "water" in its name:
 * "Water", "Sparkling water", "Coconut water". Whole words only, so
 * "Watermelon" doesn't count.
 */
export function soundsLikeWater(name: string): boolean {
  return /\bwater\b/i.test(name);
}

/** The ml one log entry adds: its amount if the food counts, else 0. */
export function waterForAmount(
  food: { unit: BaseUnit; counts_toward_hydration: boolean },
  amount: number,
): number {
  return food.unit === "ml" && food.counts_toward_hydration ? amount : 0;
}

/** Adds up a day's water. Never unknown: a food that doesn't count adds 0. */
export function waterTotal(entries: { water_ml: number }[]): number {
  return entries.reduce((sum, e) => sum + e.water_ml, 0);
}

const wholeMl = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const litres = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

/**
 * Short enough for a small ring: "750 ml", then "1.3 L" from 1,000 ml on
 * (1,250 ml rounds to 1.3 L). A tiny bit above 0 shows "<1 ml", not "0 ml".
 */
export function waterText(ml: number): string {
  if (ml > 0 && Math.round(ml) === 0) return "<1 ml";
  if (Math.round(ml) < 1000) return `${wholeMl.format(ml)} ml`;
  return `${litres.format(ml / 1000)} L`;
}
