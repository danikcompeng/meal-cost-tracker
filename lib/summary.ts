// What the Today summary shows in each place: pure functions, so the rules
// (when there's a ring, what the number says) can be unit tested.

import { formatMoney } from "./cost";
import { totalNumber, type DayTotals, type Total } from "./day-totals";
import { waterText } from "./hydration";
import { ofTarget, progress, type Targets } from "./targets";

/**
 * The cookie that remembers "details open" on this device. It lives here,
 * not in the component: a server page can't import a plain value from a
 * "use client" file (it only gets a reference to client code).
 */
export const DETAILS_COOKIE = "today_details";

export type SlotKey = "protein" | "carbs" | "fat" | "water";

/** One small ring (or, without a target, just its number). */
export type Slot = {
  key: SlotKey;
  /** The grey word under the number. */
  word: string;
  /** The one number under the ring: what's eaten, "62 g" or "1.3 L". */
  short: string;
  /** How full the ring is, or null for no ring (past day or no target). */
  fraction: number | null;
  /** The exact line in the details: "62 of 140 g" or "62 g". */
  detail: string;
  /** Protein only: the target is met. */
  reached: boolean;
  /** How many foods are missing this value (never for water). */
  missing: number;
  known: boolean;
};

/**
 * The small rings, in order: protein, carbs, fat, then water when
 * `showWater`. Past days get no rings (targets aren't stored per day, so
 * an old day would be judged against a target set later).
 */
export function summarySlots(
  totals: DayTotals,
  water: number,
  targets: Targets,
  isToday: boolean,
  showWater: boolean,
): Slot[] {
  const grams = (key: SlotKey, word: string, total: Total, target: number | null): Slot => {
    const p = isToday ? progress(total, target) : null;
    const known = total.sum !== null;
    return {
      key,
      word,
      short: known ? `${totalNumber(total)} g` : "—",
      fraction: p ? p.fraction : null,
      detail: p ? `${ofTarget(total, p.target)} g` : known ? `${totalNumber(total)} g` : "—",
      // Only protein celebrates: more protein is the point of this app.
      reached: key === "protein" && known && Boolean(p?.reached),
      missing: known ? total.missing : 0,
      known,
    };
  };

  const slots = [
    grams("protein", "protein", totals.protein_g, targets.daily_protein_g),
    grams("carbs", "carbs", totals.carbs_g, targets.daily_carbs_g),
    grams("fat", "fat", totals.fat_g, targets.daily_fat_g),
  ];

  if (showWater) {
    // Water is never unknown: a food that doesn't count adds 0.
    const p = isToday ? progress({ sum: water, missing: 0 }, targets.daily_water_ml) : null;
    slots.push({
      key: "water",
      word: "water",
      short: waterText(water),
      fraction: p ? p.fraction : null,
      detail: p
        ? `${ofTarget({ sum: water, missing: 0 }, p.target)} ml`
        : `${totalNumber({ sum: water, missing: 0 })} ml`,
      reached: false,
      missing: 0,
      known: true,
    });
  }
  return slots;
}

/**
 * Whether the water slot shows at all: when you have a water goal, a food
 * that counts toward hydration, or water logged that day. Otherwise you
 * haven't started using hydration, and it would be a "0 ml" for nothing.
 */
export function showsWater(targets: Targets, hasHydratingFood: boolean, water: number): boolean {
  return targets.daily_water_ml !== null || hasHydratingFood || water > 0;
}

/**
 * The cost line. When a food has no price the total can only be higher,
 * so it says "at least": the folded view is never wrong, even with the
 * "+ 1 food without a price" note out of sight.
 */
export function costLine(cost: Total, isToday: boolean): string {
  if (cost.sum === null) return "No prices yet for these foods";
  const at = cost.missing > 0 ? " at least" : "";
  return `${isToday ? "Today costs" : "This day cost"}${at} ${formatMoney(cost.sum)}`;
}
