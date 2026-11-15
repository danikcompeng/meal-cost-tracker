// The "I'm tired of this" ranking: which of your other recipes to offer
// instead, best first, and the one or two reasons for each card.
// Pure (no database, no React), so it can be unit tested.
//
// How the order works, like sorting a spreadsheet by several columns:
// compare the first column, and only on a tie look at the next. The
// columns are coarse groups ("close protein", "cheaper or similar"), not
// exact numbers, so the later columns still get a say. If cost were
// compared to the cent, recency would almost never matter.
//   1. Protein: close → known but not close → unknown
//   2. Foods you'd need to get: none → 1 → 2 or more (only when we know
//      what you have)
//   3. Cost: cheaper or similar → pricier → unknown
//   4. Recency: not eaten in the last 3 days → eaten recently
//   5. Ties: closer protein, cheaper, longer since you ate it, name, id
//
// Missing stays missing: an unknown protein or cost always sorts after
// known ones in that column (even when the current meal's is unknown too),
// and never earns a reason chip ("Same protein").

import { costPerServing, formatMoney, proteinPerDollar } from "./cost";
import { addDays, daysBetween } from "./dates";
import { nutrientsPerServing } from "./nutrition";
import { ingredientsMissing, missingSentence } from "./recipe-totals";
import type { Recipe } from "./types";

/** "Similar protein" = within 15% of the current meal... */
export const PROTEIN_BAND = 0.15;
/** ...or within 2 g, whichever is bigger (15% of a 5 g meal is under 1 g). */
export const PROTEIN_FLOOR_G = 2;
/** "Similar cost" = at most 10% more than the current meal... */
export const SIMILAR_COST_SHARE = 0.1;
/** ...or at most $0.25 more, whichever is bigger. */
export const SIMILAR_COST_DOLLARS = 0.25;
/** Under 5 cents apart is "Same cost"; 5 cents or more less is "cheaper". */
export const SAME_COST_CENTS = 5;
/** Eaten today, yesterday or the day before counts as "recently". */
export const RECENT_DAYS = 3;
/** How far back we look for when you last ate something. */
export const HISTORY_DAYS = 60;
/** "Foods you've had this week" = logged today or in the 6 days before. */
export const WEEK_DAYS = 7;

// Computers store most decimals slightly off (24 x 0.15 is
// 3.5999999999999996), so "exactly 15%" needs a tiny allowance to count.
const EPSILON = 1e-9;

/** The meal you're tired of, per serving. null = unknown. */
export type SwapCurrent = {
  /** null when its recipe was deleted (the entry keeps its snapshot). */
  recipeId: string | null;
  name: string;
  protein: number | null;
  cost: number | null;
};

/** One recipe you could eat instead, as plain numbers per serving. */
export type SwapCandidate = {
  id: string;
  name: string;
  protein: number | null;
  cost: number | null;
  kcal: number | null;
  /** Who's missing protein / a price / calories, for "Banana has no protein". */
  proteinMissing: string[];
  costMissing: string[];
  kcalMissing: string[];
  /** Its ingredients' foods, in recipe order (for the chips). */
  foods: { id: string; name: string }[];
};

/** One eaten entry from your history: which day, and what it was. */
export type EatenRow = { day: string; food_id: string | null; recipe_id: string | null };

/**
 * The foods you probably have. Until purchases exist it's "foods you've
 * had this week", and the cards say exactly that, never "in your kitchen".
 * Purchases you haven't marked used up will replace it later, with no
 * change to the ranking (only the wording).
 */
export type Kitchen = {
  foodIds: ReadonlySet<string>;
  source: "had-this-week" | "purchases";
};

export type SwapContext = {
  today: string;
  /** The servings you'll get: the logged entry's, or 1 from a recipe screen. */
  servings: number;
  /** Recipe id → the last day you ate it. null = history didn't load. */
  lastEaten: ReadonlyMap<string, string> | null;
  /** null = we don't know what you have (history didn't load). */
  kitchen: Kitchen | null;
};

export type RankedSwap = SwapCandidate & {
  /** Up to two chips, most important first. Only things that are true. */
  reasons: string[];
  /** Grey lines: what's unknown and who's missing it, or "Not a close match". */
  notes: string[];
  /** For the servings you'll get (the card shows these). */
  shown: { protein: number | null; cost: number | null; kcal: number | null };
  /** vs the current meal, for the servings you'll get. null = can't compare. */
  proteinChange: number | null;
  costChange: number | null;
  proteinPerDollar: number | null;
  /** "Last had 5 days ago", "Not in the last 60 days"; null if unknown. */
  lastHad: string | null;
};

/**
 * Your other recipes as candidates: the current one and recipes with no
 * ingredients (nothing to eat yet) are left out.
 */
export function swapCandidates(recipes: Recipe[], currentRecipeId: string | null): SwapCandidate[] {
  return recipes
    .filter((r) => r.id !== currentRecipeId && r.ingredients.length > 0)
    .map((r) => {
      const per = nutrientsPerServing(r.ingredients, r.servings);
      return {
        id: r.id,
        name: r.name,
        protein: per.protein_g,
        cost: costPerServing(r.ingredients, r.servings),
        kcal: per.kcal,
        proteinMissing: ingredientsMissing(r.ingredients, "protein_g"),
        costMissing: ingredientsMissing(r.ingredients, "cost"),
        kcalMissing: ingredientsMissing(r.ingredients, "kcal"),
        foods: r.ingredients.map(({ food }) => ({ id: food.id, name: food.name })),
      };
    });
}

/** Recipe id → the newest day you ate it, ignoring days after today. */
export function lastEatenByRecipe(rows: EatenRow[], today: string): Map<string, string> {
  const last = new Map<string, string>();
  for (const { day, recipe_id } of rows) {
    if (!recipe_id || day > today) continue;
    // "YYYY-MM-DD" strings sort like the dates they are.
    const seen = last.get(recipe_id);
    if (!seen || day > seen) last.set(recipe_id, day);
  }
  return last;
}

/**
 * Foods you've had in the last 7 days, alone or inside a recipe. A recipe
 * counts with the ingredients it has NOW: a log entry doesn't record which
 * foods a recipe had back then. A deleted recipe adds nothing.
 */
export function hadThisWeek(rows: EatenRow[], recipes: Recipe[], today: string): Kitchen {
  const from = addDays(today, -(WEEK_DAYS - 1));
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const foodIds = new Set<string>();
  for (const { day, food_id, recipe_id } of rows) {
    if (day < from || day > today) continue;
    if (food_id) foodIds.add(food_id);
    if (recipe_id) for (const { food } of byId.get(recipe_id)?.ingredients ?? []) foodIds.add(food.id);
  }
  return { foodIds, source: "had-this-week" };
}

/**
 * Lines shown once above the stack when the CURRENT meal is missing a
 * number, because then nothing can be matched on it.
 */
export function swapHeaderNotes(current: SwapCurrent): string[] {
  const notes: string[] = [];
  if (current.protein === null) {
    notes.push(`${current.name} has unknown protein, so these aren't matched on protein.`);
  }
  if (current.cost === null) {
    notes.push(`${current.name} has an unknown cost, so these aren't matched on price.`);
  }
  return notes;
}

/** Your other recipes, best swap first, each with its reasons and notes. */
export function rankSwaps(
  current: SwapCurrent,
  candidates: SwapCandidate[],
  context: SwapContext,
): RankedSwap[] {
  // Can't happen (the database keeps servings above 0), but 0 would make
  // every card say "Same cost", so fail loudly instead.
  if (!(context.servings > 0)) throw new Error(`Swap servings must be above 0, got ${context.servings}`);
  return (
    candidates
      // swapCandidates already leaves it out; this is a safety net so the
      // meal you're tired of is never offered back to you.
      .filter((c) => c.id !== current.recipeId)
      .map((candidate) => score(current, candidate, context))
      .sort(compareScores)
      .map(({ swap }) => swap)
  );
}

// Each step works out its sort group (0 = best) and what the card needs.

type ProteinPart = {
  group: number;
  /** Grams apart per serving; null if either is unknown. */
  gap: number | null;
  close: boolean;
  /** Same whole grams for the servings you'll get. */
  same: boolean;
  /** vs now, for the servings you'll get. */
  change: number | null;
};

// Compared per serving: the servings are the same on both sides, so the
// answer is the same for 1.5 servings.
function proteinPart(now: number | null, next: number | null, servings: number): ProteinPart {
  // Unknown always sorts last, even when the current meal is unknown too.
  if (next === null) return { group: 2, gap: null, close: false, same: false, change: null };
  // The current meal is unknown: nothing to match, but a known protein
  // still beats an unknown one.
  if (now === null) return { group: 0, gap: null, close: false, same: false, change: null };
  const gap = Math.abs(next - now);
  const close = gap <= Math.max(PROTEIN_BAND * now, PROTEIN_FLOOR_G) + EPSILON;
  return {
    group: close ? 0 : 1,
    gap,
    close,
    same: close && Math.round(next * servings) === Math.round(now * servings),
    change: (next - now) * servings,
  };
}

type CostPart = {
  group: number;
  /** Cents cheaper for the servings you'll get (negative = more). */
  centsSaved: number | null;
  change: number | null;
};

function costPart(now: number | null, next: number | null, servings: number): CostPart {
  if (next === null) return { group: 2, centsSaved: null, change: null };
  // Can't say cheaper, but a known cost still beats an unknown one.
  if (now === null) return { group: 0, centsSaved: null, change: null };
  const diff = next - now;
  const similar = diff <= Math.max(SIMILAR_COST_SHARE * now, SIMILAR_COST_DOLLARS) + EPSILON;
  return {
    group: similar ? 0 : 1,
    // Rounded to whole cents for the servings you'll get, so "$0.50
    // cheaper" is what you'll see on the day, and 5¢ can't come out as 4¢.
    centsSaved: Math.round(-diff * servings * 100),
    change: diff * servings,
  };
}

type Scored = { swap: RankedSwap; keys: number[] };

function score(current: SwapCurrent, c: SwapCandidate, context: SwapContext): Scored {
  const { servings, kitchen, lastEaten } = context;
  const times = (v: number | null) => (v === null ? null : v * servings);

  const protein = proteinPart(current.protein, c.protein, servings);
  const cost = costPart(current.cost, c.cost, servings);

  // Foods you have, and how many you'd need to get. Grouped as none / 1 /
  // 2 or more, so it doesn't drown out cost and recency (an exact count
  // would almost always decide on its own).
  const had = kitchen ? c.foods.filter((f) => kitchen.foodIds.has(f.id)).length : null;
  const toGet = had === null ? 0 : Math.min(c.foods.length - had, 2);

  // lastEaten null = history didn't load: recency is a tie for everyone.
  const lastDay = lastEaten?.get(c.id) ?? null;
  const daysSince = lastDay === null ? null : daysBetween(lastDay, context.today);
  const recent = daysSince !== null && daysSince < RECENT_DAYS;

  // Reason chips, most important first, only things that are true.
  const reasons: string[] = [];
  if (protein.close) reasons.push(protein.same ? "Same protein" : "Similar protein");
  // Only when at least half its foods are ones you have: "Uses 1 food
  // you've had this week" out of 8 isn't a reason to pick it.
  if (kitchen && had !== null && had > 0 && had * 2 >= c.foods.length) {
    reasons.push(kitchenReason(had, c.foods.length, kitchen.source));
  }
  if (cost.centsSaved !== null && cost.centsSaved >= SAME_COST_CENTS) {
    reasons.push(`${formatMoney(cost.centsSaved / 100)} cheaper`);
  } else if (cost.centsSaved !== null && Math.abs(cost.centsSaved) < SAME_COST_CENTS) {
    reasons.push("Same cost");
  }
  if (lastEaten !== null && !recent) {
    reasons.push(daysSince === null ? `Not had it in ${HISTORY_DAYS}+ days` : `Haven't had it in ${daysSince} days`);
  }

  const swap: RankedSwap = {
    ...c,
    reasons: reasons.slice(0, 2),
    notes: notesFor(c, protein, cost, reasons.length > 0),
    shown: { protein: times(c.protein), cost: times(c.cost), kcal: times(c.kcal) },
    proteinChange: protein.change,
    costChange: cost.change,
    proteinPerDollar: proteinPerDollar(c.protein, c.cost),
    lastHad: lastEaten === null ? null : lastHadText(daysSince),
  };

  return {
    swap,
    keys: [
      protein.group,
      toGet,
      cost.group,
      recent ? 1 : 0,
      protein.gap ?? Infinity,
      c.cost ?? Infinity,
      // Longer ago first. Not in the history sorts before any number of
      // days; history that didn't load is a tie (0) for everyone.
      lastEaten === null ? 0 : -(daysSince ?? Infinity),
    ],
  };
}

/**
 * The grey lines on a card. They say what's unknown and what that means,
 * never where the card sits in the stack (an unknown cost can still be
 * card 1 if its protein is the closest).
 */
function notesFor(c: SwapCandidate, protein: ProteinPart, cost: CostPart, hasReasons: boolean): string[] {
  const notes: string[] = [];
  if (c.protein === null) {
    const who = missingSentence(c.proteinMissing, "no protein") ?? "Protein unknown";
    notes.push(`${who}, so it can't be matched on protein.`);
  }
  if (c.cost === null) {
    const who = missingSentence(c.costMissing, "no price yet") ?? "Cost unknown";
    notes.push(`${who}, so it can't be compared on price.`);
  }
  if (c.kcal === null) {
    const who = missingSentence(c.kcalMissing, "no calories");
    notes.push(who ? `${who}.` : "Calories unknown.");
  }

  // Known protein that isn't close is said plainly, even when the card has
  // other reasons: "Haven't had it in 5 days" mustn't hide 15 g less. With
  // reasons, only the protein part, so a "$0.62 cheaper" chip isn't
  // repeated. Without reasons, everything we know.
  const parts: string[] = [];
  if (protein.change !== null && !protein.close && Math.round(protein.change) !== 0) {
    const grams = Math.abs(Math.round(protein.change));
    parts.push(`${grams} g ${protein.change < 0 ? "less" : "more"} protein`);
  }
  if (!hasReasons && cost.centsSaved !== null && cost.centsSaved !== 0) {
    parts.push(`${formatMoney(Math.abs(cost.centsSaved) / 100)} ${cost.centsSaved < 0 ? "more" : "cheaper"}`);
  }
  // Nothing known to compare: say nothing rather than claim "not a match".
  if (parts.length > 0) notes.push(`Not a close match: ${parts.join(", ")}.`);
  return notes;
}

function compareScores(a: Scored, b: Scored): number {
  for (let i = 0; i < a.keys.length; i++) {
    // Compare rather than subtract: Infinity - Infinity is NaN.
    if (a.keys[i] !== b.keys[i]) return a.keys[i] < b.keys[i] ? -1 : 1;
  }
  // Name, then id, so the order is the same whatever order recipes arrive
  // in. A fixed language, so every phone sorts names the same way.
  const byName = a.swap.name.localeCompare(b.swap.name, "en-US");
  if (byName !== 0) return byName;
  return a.swap.id < b.swap.id ? -1 : a.swap.id > b.swap.id ? 1 : 0;
}

function kitchenReason(had: number, total: number, source: Kitchen["source"]): string {
  const foods = `${had} ${had === 1 ? "food" : "foods"}`;
  if (source === "purchases") return had === total ? "All in your kitchen" : `Uses ${foods} in your kitchen`;
  return `Uses ${foods} you've had this week`;
}

function lastHadText(daysSince: number | null): string {
  if (daysSince === null) return `Not in the last ${HISTORY_DAYS} days`;
  if (daysSince === 0) return "Had it today";
  if (daysSince === 1) return "Had it yesterday";
  return `Last had ${daysSince} days ago`;
}
