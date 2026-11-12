// Daily targets: checking what you typed, and how a day compares to them.
// Pure functions, no database or React, so they can be unit tested.
//
// A target that's blank is null and means "no target". It is never 0,
// because a 0 g carbs target is a real choice and "not set" isn't.

import { totalNumber, type Total } from "./day-totals";
import { kcalFromMacros, kcalGapTooBig } from "./macros";
import { AMBIGUOUS_COMMA, parseDecimal } from "./numbers";

export type Targets = {
  daily_kcal: number | null;
  daily_protein_g: number | null;
  daily_carbs_g: number | null;
  daily_fat_g: number | null;
  /** Water goal in ml. Never blank: everyone starts at 2,000 ml. */
  daily_water_ml: number;
  /** "Show water on Today". Off hides water there; the goal is kept. */
  show_water: boolean;
};

export const DEFAULT_WATER_ML = 2000;

const WATER_GOAL_ERROR = "Enter a goal in ml, like 2000.";

/**
 * What you have before saving Settings for the first time: no calorie or
 * macro targets, and a 2,000 ml water goal with the water ring on, so the
 * ring shows from day one.
 */
export const DEFAULT_TARGETS: Targets = {
  daily_kcal: null,
  daily_protein_g: null,
  daily_carbs_g: null,
  daily_fat_g: null,
  daily_water_ml: DEFAULT_WATER_ML,
  show_water: true,
};

export type RawTargets = {
  kcal?: unknown;
  protein?: unknown;
  carbs?: unknown;
  fat?: unknown;
  water?: unknown;
  /** The "Show water on Today" switch: "true" when on. */
  showWater?: unknown;
};

export type TargetsResult =
  | { ok: true; value: Targets }
  | { ok: false; fieldErrors: Record<string, string> };

// Same limits as the database (006_user_settings.sql, 009_hydration.sql).
const MAX_KCAL = 10000;
const MAX_GRAMS = 1000;
const MAX_WATER_ML = 10000;

/**
 * Turns the four boxes into targets. Blank = no target. Decimals are
 * rounded to whole numbers (140.6 g -> 141 g), since a target doesn't need
 * more precision than that. "1,000" is refused: it could mean 1000 or 1.
 */
export function validateTargets(raw: RawTargets): TargetsResult {
  const fieldErrors: Record<string, string> = {};

  const read = (key: keyof RawTargets, max: number, unit: string): number | null => {
    const parsed = parseDecimal(raw[key]);
    if (parsed === null) return null;
    if (parsed === "ambiguous") {
      fieldErrors[key] = AMBIGUOUS_COMMA;
      return null;
    }
    if (parsed === "invalid" || parsed < 0) {
      // The water goal can't be left blank, so don't suggest it.
      fieldErrors[key] =
        key === "water" ? WATER_GOAL_ERROR : "Enter a number, or leave it blank.";
      return null;
    }
    const rounded = Math.round(parsed);
    if (rounded > max) {
      fieldErrors[key] = `That looks too high. The most is ${max.toLocaleString("en-US")} ${unit}.`;
      return null;
    }
    return rounded;
  };

  const water = read("water", MAX_WATER_ML, "ml");
  const value: Targets = {
    daily_kcal: read("kcal", MAX_KCAL, "kcal"),
    daily_protein_g: read("protein", MAX_GRAMS, "g"),
    daily_carbs_g: read("carbs", MAX_GRAMS, "g"),
    daily_fat_g: read("fat", MAX_GRAMS, "g"),
    daily_water_ml: water ?? DEFAULT_WATER_ML,
    // Only an explicit "false" turns water off. A missing value (a page
    // loaded before this switch existed) keeps the default: on.
    show_water: raw.showWater !== "false",
  };

  // 0.4 rounds to 0 too, so check after rounding.
  if (value.daily_kcal === 0) {
    fieldErrors.kcal = "Calories can't be 0. Leave it blank for no target.";
  }
  // The water goal can't be blank (turning water off is the switch), and a
  // 0 ml goal would be met before you drink anything. Only checked when
  // the box had no other mistake in it.
  if (!fieldErrors.water && (water === null || water === 0)) {
    fieldErrors.water = WATER_GOAL_ERROR;
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true, value };
}

/**
 * True once you've set a calorie or macro target. The water goal doesn't
 * count: everyone has one by default, so it would hide "Set daily targets"
 * from new users.
 */
export function hasAnyTarget(t: Targets): boolean {
  return (
    t.daily_kcal !== null ||
    t.daily_protein_g !== null ||
    t.daily_carbs_g !== null ||
    t.daily_fat_g !== null
  );
}

const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/**
 * A soft hint when protein, carbs and fat (at 4, 4 and 9 kcal per gram)
 * add up to something more than 20% away from the calorie target. Same
 * rule as the food form. Only when all four are set. Never blocks saving.
 *
 * Example: 2,000 kcal with 100 g protein, 150 g carbs, 50 g fat
 * -> 400 + 600 + 450 = 1,450 kcal, 550 less (27.5%) -> hint.
 */
export function targetsHint(t: Targets): string | null {
  const { daily_kcal: kcal, daily_protein_g: p, daily_carbs_g: c, daily_fat_g: f } = t;
  if (kcal === null || p === null || c === null || f === null) return null;
  const estimate = kcalFromMacros(p, c, f);
  if (!kcalGapTooBig(kcal, estimate)) return null;
  const gap = Math.abs(kcal - estimate);
  return `Your macros add up to ${whole.format(estimate)} kcal, ${whole.format(gap)} ${
    estimate < kcal ? "less" : "more"
  } than your calorie target.`;
}

/** A gentle note under 1,200 kcal. Advice only, never blocks saving. */
export function lowCalorieNote(kcal: number | null): string | null {
  if (kcal === null || kcal >= 1200) return null;
  return "That's lower than most adults need. If it's intentional, it may be worth checking with a doctor or dietitian.";
}

export type Progress = {
  target: number;
  /** What's known to be eaten, rounded to a whole number like the screen shows it. */
  eaten: number;
  /** target - eaten. Negative when over. */
  left: number;
  over: boolean;
  /** Eaten is at least the target. Used for "Goal reached" on protein. */
  reached: boolean;
  /** How full the bar is, 0 to 1. Stays at 1 once you're over. */
  fraction: number;
  /** Some foods are missing this value, so the real total may be higher. */
  incomplete: boolean;
};

/**
 * How a day's total compares to one target, or null when there's no target.
 *
 * Missing values: the total only counts what's known. A food with no
 * calories might have any amount, so "860 kcal left" could really be less:
 * `incomplete` lets the screen say "up to 860 kcal left" instead.
 *
 * Everything uses the rounded total, so "140 of 140 g" never shows next to
 * an unfilled bar because the real total was 139.6.
 */
export function progress(total: Total, target: number | null): Progress | null {
  if (target === null) return null;
  const eaten = Math.round(total.sum ?? 0);
  const left = target - eaten;
  return {
    target,
    eaten,
    left,
    over: left < 0,
    reached: eaten >= target,
    // A 0 g target is already met with nothing eaten, so the bar is full.
    fraction: target === 0 ? 1 : Math.min(eaten / target, 1),
    incomplete: total.missing > 0,
  };
}

/**
 * The big calorie line: { prefix: "up to", number: "860", suffix: "kcal left" }.
 * Over the target with foods missing calories, the real overshoot can only
 * be bigger, so it says "at least 120 kcal over".
 */
export function kcalHeadline(p: Progress): { prefix: string | null; number: string; suffix: string } {
  const number = whole.format(Math.abs(p.left));
  if (p.over) return { prefix: p.incomplete ? "at least" : null, number, suffix: "kcal over" };
  return { prefix: p.incomplete ? "up to" : null, number, suffix: "kcal left" };
}

/** "1,140 of 2,000", or "— of 2,000" when none of the foods have a value. */
export function ofTarget(total: Total, target: number): string {
  return `${totalNumber(total)} of ${whole.format(target)}`;
}
