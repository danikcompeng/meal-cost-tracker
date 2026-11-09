// Adds up a day (or one meal) of log entries. Pure functions.
//
// The rule: a missing value never counts as 0. Each total is the sum of the
// values we DO know, plus how many entries are missing that value, so the
// screen can say "1,240 kcal + 1 food without calories".

import type { Macros } from "./macros";

export type Total = {
  /** Sum of the known values. null only when entries exist but none are known. */
  sum: number | null;
  /** How many entries have no value for this. */
  missing: number;
};

export type DayTotals = Record<keyof Macros | "cost", Total> & { count: number };

type Totalable = Macros & { cost: number | null };

const KEYS = ["kcal", "protein_g", "carbs_g", "fat_g", "cost"] as const;

export function dayTotals(entries: Totalable[]): DayTotals {
  const totals = { count: entries.length } as DayTotals;
  for (const key of KEYS) {
    const known = entries.map((e) => e[key]).filter((v): v is number => v !== null);
    totals[key] = {
      // Nothing logged = a real 0 (you ate nothing). Logged but all
      // unknown = null, which shows as "—".
      sum: entries.length > 0 && known.length === 0 ? null : known.reduce((a, b) => a + b, 0),
      missing: entries.length - known.length,
    };
  }
  return totals;
}

const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** A total rounded to whole numbers: "1,240", or "—" when unknown. */
export function totalNumber(total: Total): string {
  return total.sum === null ? "—" : whole.format(total.sum);
}

/** "+ 1 food without calories", "+ 2 foods without a price", or null. */
export function missingNote(missing: number, without: string): string | null {
  if (missing <= 0) return null;
  return `+ ${missing} ${missing === 1 ? "food" : "foods"} without ${without}`;
}
