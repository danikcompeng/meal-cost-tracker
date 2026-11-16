import { describe, expect, it } from "vitest";
import { NO_EXTRAS } from "./macros";
import {
  hadThisWeek,
  lastEatenByRecipe,
  rankSwaps,
  swapCandidates,
  swapCurrentFromEntry,
  swapHeaderNotes,
  type EatenRow,
  type Kitchen,
  type SwapCandidate,
  type SwapContext,
  type SwapCurrent,
} from "./swap";
import type { Food, Recipe } from "./types";

const TODAY = "2026-11-14";

// The meal you're tired of: 24 g protein for $1.12 a serving.
const current: SwapCurrent = { recipeId: "oats-bowl", name: "Overnight oats", protein: 24, cost: 1.12 };

// A recipe you could swap to. By default it's a close, cheaper match
// with no foods listed, so each test only changes what it's about.
function cand(id: string, over: Partial<SwapCandidate> = {}): SwapCandidate {
  return {
    id,
    name: id,
    protein: 24,
    cost: 1.0,
    kcal: 500,
    proteinMissing: [],
    costMissing: [],
    kcalMissing: [],
    foods: [],
    ...over,
  };
}

function ctx(over: Partial<SwapContext> = {}): SwapContext {
  return { today: TODAY, servings: 1, lastEaten: new Map(), kitchen: null, ...over };
}

const ids = (list: { id: string }[]) => list.map((s) => s.id);
const kitchen = (...foodIds: string[]): Kitchen => ({ foodIds: new Set(foodIds), source: "had-this-week" });
const one = (c: SwapCandidate, context: SwapContext = ctx(), cur: SwapCurrent = current) =>
  rankSwaps(cur, [c], context)[0];

describe("swapCandidates", () => {
  const food: Food = {
    id: "lentils",
    name: "Red lentils",
    brand: null,
    barcode: null,
    price: 2,
    package_size: 1000,
    unit: "g",
    kcal: 350,
    protein_g: 25,
    carbs_g: 60,
    fat_g: 1,
    ...NO_EXTRAS,
    counts_toward_hydration: false,
  };
  const banana: Food = { ...food, id: "banana", name: "Banana", unit: "each", protein_g: null };
  const dal: Recipe = { id: "dal", name: "Lentil dal", servings: 2, ingredients: [{ food, amount: 200 }] };
  const smoothie: Recipe = {
    id: "smoothie",
    name: "Smoothie",
    servings: 1,
    ingredients: [{ food: banana, amount: 2 }],
  };
  const empty: Recipe = { id: "empty", name: "Not filled in", servings: 1, ingredients: [] };
  const oats: Recipe = { ...dal, id: "oats-bowl", name: "Overnight oats" };

  it("leaves out the current recipe and recipes with no ingredients", () => {
    expect(ids(swapCandidates([oats, dal, empty, smoothie], "oats-bowl"))).toEqual(["dal", "smoothie"]);
  });

  it("one other recipe gives a stack of one; none gives an empty list", () => {
    expect(ids(swapCandidates([oats, dal], "oats-bowl"))).toEqual(["dal"]);
    expect(swapCandidates([oats, empty], "oats-bowl")).toEqual([]);
  });

  it("keeps every recipe when the current one was deleted (no id)", () => {
    expect(ids(swapCandidates([oats, dal], null))).toEqual(["oats-bowl", "dal"]);
  });

  it("works out protein and cost per serving, and who's missing them", () => {
    // 200 g of lentils at 25 g / 100 g = 50 g, $0.40, over 2 servings.
    const [d, s] = swapCandidates([dal, smoothie], null);
    expect(d).toMatchObject({ protein: 25, cost: 0.2, kcal: 350, proteinMissing: [], costMissing: [] });
    expect(d.foods).toEqual([{ id: "lentils", name: "Red lentils" }]);
    expect(s.protein).toBeNull();
    expect(s.proteinMissing).toEqual(["Banana"]);
  });
});

describe("protein band", () => {
  const close = (protein: number, cur: number = 24) =>
    one(cand("x", { protein }), ctx(), { ...current, protein: cur }).reasons.some((r) =>
      r.endsWith("protein"),
    );

  it("24 g vs 27.5 g (14.6%) is close, vs 28 g (16.7%) is not", () => {
    expect(close(27.5)).toBe(true);
    expect(close(28)).toBe(false);
    expect(close(20.5)).toBe(true);
    expect(close(20)).toBe(false);
  });

  it("exactly 15% counts as close, even though 24 x 1.15 isn't stored exactly", () => {
    expect(27.6 - 24 <= 24 * 0.15).toBe(false); // why the allowance exists
    expect(close(27.6)).toBe(true);
  });

  it("small meals get a 2 g floor", () => {
    expect(close(6.5, 5)).toBe(true);
    expect(close(1.5, 0)).toBe(true);
    expect(close(7.5, 5)).toBe(false);
  });

  it("says Same protein for the same whole grams, otherwise Similar", () => {
    expect(one(cand("x", { protein: 24.4 })).reasons[0]).toBe("Same protein");
    expect(one(cand("x", { protein: 25 })).reasons[0]).toBe("Similar protein");
  });
});

describe("order of importance", () => {
  it("close protein but pricier beats far protein but cheaper", () => {
    const pricier = cand("pricier", { protein: 25, cost: 3 });
    const far = cand("far", { protein: 10, cost: 0.5 });
    expect(ids(rankSwaps(current, [far, pricier], ctx()))).toEqual(["pricier", "far"]);
  });

  it("fewer foods to get beats cheaper, when we know what you have", () => {
    const have = cand("have", { cost: 1.1, foods: [{ id: "a", name: "A" }, { id: "b", name: "B" }] });
    const buy = cand("buy", { cost: 0.5, foods: [{ id: "z", name: "Z" }] });
    expect(ids(rankSwaps(current, [buy, have], ctx({ kitchen: kitchen("a", "b") })))).toEqual(["have", "buy"]);
    // Not knowing what you have changes nothing: cheaper wins again.
    expect(ids(rankSwaps(current, [have, buy], ctx({ kitchen: null })))).toEqual(["buy", "have"]);
  });

  it("foods to get is grouped: 2 and 3 to get are a tie, so cost decides", () => {
    const foods = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `f${i}`, name: `F${i}` }));
    const two = cand("two", { cost: 1.1, foods: foods(2) });
    const three = cand("three", { cost: 0.5, foods: foods(3) });
    expect(ids(rankSwaps(current, [two, three], ctx({ kitchen: kitchen() })))).toEqual(["three", "two"]);
  });

  it("similar cost: up to $0.25 more, or 10% more for pricier meals", () => {
    // "test" was eaten yesterday; "fresh" is far pricier but you haven't
    // had it. Cost comes before recency, so "test" is first only while
    // its cost still counts as similar. Past the band both are "pricier",
    // and then recency puts "fresh" first.
    const lastEaten = new Map([["test", "2026-11-13"]]);
    const first = (cost: number, now: number) =>
      ids(rankSwaps({ ...current, cost: now }, [cand("test", { cost }), cand("fresh", { cost: 99 })], ctx({ lastEaten })))[0];
    // $1.12 + $0.25 = $1.37 (stored as 0.2500000000000002 more, so this
    // also needs the float allowance).
    expect(first(1.37, 1.12)).toBe("test");
    expect(first(1.38, 1.12)).toBe("fresh");
    // $5 + 10% = $5.50.
    expect(first(5.5, 5)).toBe("test");
    expect(first(5.51, 5)).toBe("fresh");
  });

  it("cheaper beats not eaten recently", () => {
    const cheap = cand("cheap", { cost: 1 });
    const fresh = cand("fresh", { cost: 3 });
    const lastEaten = new Map([["cheap", "2026-11-13"]]);
    expect(ids(rankSwaps(current, [fresh, cheap], ctx({ lastEaten })))).toEqual(["cheap", "fresh"]);
  });

  it("eaten yesterday goes below the same meal not eaten in 5 days", () => {
    const lastEaten = new Map([
      ["A dal", "2026-11-13"],
      ["Z dal", "2026-11-09"],
    ]);
    expect(ids(rankSwaps(current, [cand("A dal"), cand("Z dal")], ctx({ lastEaten })))).toEqual([
      "Z dal",
      "A dal",
    ]);
  });

  it("within a group, closer protein comes first, then cheaper", () => {
    const near = cand("near", { protein: 24.5, cost: 1.1 });
    const nearer = cand("nearer", { protein: 24, cost: 1.1 });
    const cheaper = cand("cheaper", { protein: 24, cost: 0.9 });
    expect(ids(rankSwaps(current, [near, nearer, cheaper], ctx()))).toEqual(["cheaper", "nearer", "near"]);
  });

  it("after that, longer since you ate it, and never eaten first", () => {
    const lastEaten = new Map([
      ["a", "2026-11-01"],
      ["b", "2026-11-08"],
    ]);
    expect(ids(rankSwaps(current, [cand("b"), cand("a"), cand("c")], ctx({ lastEaten })))).toEqual([
      "c",
      "a",
      "b",
    ]);
  });
});

describe("ties", () => {
  it("identical numbers go A to Z by name, then by id", () => {
    const list = [cand("2", { name: "Lentil dal" }), cand("1", { name: "Bean chili" }), cand("0", { name: "Lentil dal" })];
    expect(ids(rankSwaps(current, list, ctx()))).toEqual(["1", "0", "2"]);
  });

  it("shuffling the input gives the same order", () => {
    const list = [
      cand("a", { protein: 25, cost: 0.8 }),
      cand("b", { protein: null }),
      cand("c", { cost: null }),
      cand("d", { protein: 10 }),
      cand("e"),
      cand("f", { name: "e" }),
    ];
    const lastEaten = new Map([["e", "2026-11-13"]]);
    const forward = ids(rankSwaps(current, list, ctx({ lastEaten })));
    const backward = ids(rankSwaps(current, [...list].reverse(), ctx({ lastEaten })));
    const middle = ids(rankSwaps(current, [list[3], list[0], list[5], list[2], list[4], list[1]], ctx({ lastEaten })));
    expect(backward).toEqual(forward);
    expect(middle).toEqual(forward);
  });
});

describe("missing stays missing", () => {
  it("unknown protein ranks below known-but-far, gets no protein chip, and says who", () => {
    const unknown = cand("unknown", { protein: null, proteinMissing: ["Banana"] });
    const far = cand("far", { protein: 5 });
    const ranked = rankSwaps(current, [unknown, far], ctx());
    expect(ids(ranked)).toEqual(["far", "unknown"]);
    expect(ranked[1].reasons.some((r) => r.endsWith("protein"))).toBe(false);
    expect(ranked[1].notes).toContain("Banana has no protein, so it can't be matched on protein.");
    expect(ranked[1].proteinChange).toBeNull();
    expect(ranked[1].shown.protein).toBeNull();
  });

  it("unknown cost ranks below pricier, gets no cost chip, and says no price yet", () => {
    const unknown = cand("unknown", { cost: null, costMissing: ["Rolled oats"] });
    const pricier = cand("pricier", { cost: 5 });
    const ranked = rankSwaps(current, [unknown, pricier], ctx());
    expect(ids(ranked)).toEqual(["pricier", "unknown"]);
    expect(ranked[1].reasons.some((r) => r.includes("cheaper") || r === "Same cost")).toBe(false);
    expect(ranked[1].notes).toContain("Rolled oats has no price yet, so it can't be compared on price.");
    expect(ranked[1].costChange).toBeNull();
    expect(ranked[1].proteinPerDollar).toBeNull();
  });

  it("current protein unknown: no protein chips, cost decides, one line above the stack", () => {
    const cur = { ...current, protein: null };
    const sameProtein = cand("same", { protein: 24, cost: 2 });
    const cheap = cand("cheap", { protein: 5, cost: 1 });
    const ranked = rankSwaps(cur, [sameProtein, cheap], ctx());
    expect(ids(ranked)).toEqual(["cheap", "same"]);
    expect(ranked.flatMap((s) => s.reasons).some((r) => r.endsWith("protein"))).toBe(false);
    expect(ranked.flatMap((s) => s.notes).some((n) => n.startsWith("Not a close match: "))).toBe(false);
    expect(swapHeaderNotes(cur, true)).toEqual([
      "Overnight oats has unknown protein, so these aren't matched on protein.",
    ]);
  });

  it("current protein unknown: a known protein still beats an unknown one", () => {
    const cur = { ...current, protein: null };
    // "A" would win on name, so this fails if unknown protein isn't last.
    const unknown = cand("A unknown", { protein: null, proteinMissing: ["Banana"] });
    const known = cand("Z known", { protein: 30 });
    const ranked = rankSwaps(cur, [unknown, known], ctx());
    expect(ids(ranked)).toEqual(["Z known", "A unknown"]);
    expect(ranked[1].notes).toContain("Banana has no protein, so it can't be matched on protein.");
  });

  it("an unknown cost on the closest protein can be card 1, and the note doesn't say otherwise", () => {
    const noPrice = cand("noPrice", { protein: 24, cost: null, costMissing: ["Rolled oats"] });
    const far = cand("far", { protein: 10, cost: 0.5 });
    const ranked = rankSwaps(current, [far, noPrice], ctx());
    expect(ids(ranked)).toEqual(["noPrice", "far"]);
    expect(ranked[0].notes).toEqual(["Rolled oats has no price yet, so it can't be compared on price."]);
  });

  it("unknown calories show who's missing them, and don't change the order", () => {
    const s = one(cand("x", { kcal: null, kcalMissing: ["Banana"] }));
    expect(s.shown.kcal).toBeNull();
    expect(s.notes).toContain("Banana has no calories.");
    const list = [cand("b"), cand("a", { kcal: null })];
    expect(ids(rankSwaps(current, list, ctx()))).toEqual(["a", "b"]);
  });

  it("with nothing known to compare, no 'Not a close match' claim", () => {
    const s = one(cand("x", { protein: null, cost: null }), ctx({ lastEaten: new Map([["x", TODAY]]) }));
    expect(s.reasons).toEqual([]);
    expect(s.notes.some((n) => n.startsWith("Not a close match"))).toBe(false);
  });

  it("both unknown: two lines above the stack", () => {
    expect(swapHeaderNotes({ ...current, protein: null, cost: null }, true)).toHaveLength(2);
  });

  it("says so when what you ate lately didn't load, and not otherwise", () => {
    expect(swapHeaderNotes(current, false)).toEqual([
      "Couldn't load what you've eaten lately, so recent meals and this week's foods aren't checked.",
    ]);
    expect(swapHeaderNotes(current, true)).toEqual([]);
  });

  it("current cost unknown: no cost chips, but a known cost still beats an unknown one", () => {
    const cur = { ...current, cost: null };
    const known = cand("known", { cost: 9 });
    const unknown = cand("unknown", { cost: null, costMissing: ["Tofu"] });
    const ranked = rankSwaps(cur, [unknown, known], ctx());
    expect(ids(ranked)).toEqual(["known", "unknown"]);
    expect(ranked.flatMap((s) => s.reasons).some((r) => r.includes("cheaper") || r === "Same cost")).toBe(false);
    expect(swapHeaderNotes(cur, true)).toEqual([
      "Overnight oats has an unknown cost, so these aren't matched on price.",
    ]);
  });

  it("a known current meal needs no line above the stack", () => {
    expect(swapHeaderNotes(current, true)).toEqual([]);
  });

  it("kitchen unknown: no effect on order and no kitchen chip", () => {
    const list = [cand("a", { foods: [{ id: "f", name: "F" }] }), cand("b")];
    const ranked = rankSwaps(current, list, ctx({ kitchen: null }));
    expect(ids(ranked)).toEqual(["a", "b"]);
    expect(ranked.flatMap((s) => s.reasons).some((r) => r.includes("this week"))).toBe(false);
  });

  it("history didn't load: no effect on order, no 'haven't had it', no 'last had'", () => {
    const list = [cand("a"), cand("b")];
    const ranked = rankSwaps(current, list, ctx({ lastEaten: null }));
    expect(ids(ranked)).toEqual(["a", "b"]);
    expect(ranked.flatMap((s) => s.reasons).some((r) => r.includes("had it"))).toBe(false);
    expect(ranked.map((s) => s.lastHad)).toEqual([null, null]);
  });
});

describe("reasons", () => {
  it("at most two, in order: protein, foods you have, cost, recency", () => {
    const c = cand("x", { protein: 25, cost: 0.62, foods: [{ id: "a", name: "A" }, { id: "b", name: "B" }] });
    expect(one(c, ctx({ kitchen: kitchen("a", "b") })).reasons).toEqual([
      "Similar protein",
      "Uses 2 foods you've had this week",
    ]);
    expect(one(c).reasons).toEqual(["Similar protein", "$0.50 cheaper"]);
    expect(one({ ...c, protein: 10 }).reasons).toEqual(["$0.50 cheaper", "Not had it in 60+ days"]);
  });

  it("foods you have: said honestly, and only when it's at least half the recipe", () => {
    const foods = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
    ];
    const reasonsWith = (k: Kitchen) => one(cand("x", { protein: 10, cost: 5, foods }), ctx({ kitchen: k })).reasons[0];
    expect(reasonsWith(kitchen("a"))).not.toContain("this week");
    expect(reasonsWith(kitchen("a", "b"))).toBe("Uses 2 foods you've had this week");
    expect(one(cand("x", { protein: 10, cost: 5, foods: [foods[0]] }), ctx({ kitchen: kitchen("a") })).reasons[0]).toBe(
      "Uses 1 food you've had this week",
    );
    // Once purchases replace the stand-in, the wording changes, not the ranking.
    expect(reasonsWith({ foodIds: new Set(["a", "b", "c"]), source: "purchases" })).toBe("All in your kitchen");
    expect(reasonsWith({ foodIds: new Set(["a", "b"]), source: "purchases" })).toBe("Uses 2 foods in your kitchen");
  });

  it("cheaper is for the servings you'll get", () => {
    const s = one(cand("x", { cost: 0.62 }), ctx({ servings: 1.5 }));
    expect(s.reasons).toContain("$0.75 cheaper");
    expect(s.costChange).toBeCloseTo(-0.75);
    expect(s.shown.cost).toBeCloseTo(0.93);
  });

  it("under 5 cents apart is Same cost; 5 cents is cheaper", () => {
    expect(one(cand("x", { cost: 1.08 })).reasons).toContain("Same cost");
    expect(one(cand("x", { cost: 1.16 })).reasons).toContain("Same cost");
    expect(one(cand("x", { cost: 1.07 })).reasons).toContain("$0.05 cheaper");
    expect(one(cand("x", { cost: 1.17 })).reasons.some((r) => r.includes("cost") || r.includes("cheaper"))).toBe(false);
  });

  it("nothing true: no chips, and a plain 'Not a close match'", () => {
    const s = one(cand("x", { protein: 18, cost: 1.52 }), ctx({ lastEaten: new Map([["x", TODAY]]) }));
    expect(s.reasons).toEqual([]);
    expect(s.notes).toEqual(["Not a close match: 6 g less protein, $0.40 more."]);
  });

  it("far protein is said even when the card has other reasons, without repeating the chip", () => {
    const s = one(cand("x", { protein: 30, cost: 0.5 }));
    expect(s.reasons[0]).toBe("$0.62 cheaper");
    expect(s.notes).toEqual(["Not a close match: 6 g more protein."]);
  });

  it("Same protein is judged for the servings you'll get", () => {
    // 24 vs 24.3 a serving: 36 g vs 36.45 g for 1.5, both "36 g".
    expect(one(cand("x", { protein: 24.3 }), ctx({ servings: 1.5 })).reasons[0]).toBe("Same protein");
    // 24.4: 36.6 g rounds to 37 g, so it's only "Similar".
    expect(one(cand("x", { protein: 24.4 }), ctx({ servings: 1.5 })).reasons[0]).toBe("Similar protein");
  });

  it("a current meal that costs $0", () => {
    const free = { ...current, cost: 0 };
    expect(one(cand("x", { cost: 0.03 }), ctx(), free).reasons).toContain("Same cost");
    // A free candidate: protein per $ is hidden, never "infinite".
    expect(one(cand("x", { cost: 0 }), ctx(), free).proteinPerDollar).toBeNull();
  });

  it("refuses servings of 0 or less instead of calling everything the same", () => {
    expect(() => rankSwaps(current, [cand("x")], ctx({ servings: 0 }))).toThrow();
    expect(() => rankSwaps(current, [cand("x")], ctx({ servings: -1 }))).toThrow();
  });

  it("never offers the current recipe back, even if it's passed in", () => {
    expect(ids(rankSwaps(current, [cand("oats-bowl"), cand("dal")], ctx()))).toEqual(["dal"]);
  });

  it("days since you had it", () => {
    const at = (day: string | null) => {
      const lastEaten = new Map(day ? [["x", day]] : []);
      const s = one(cand("x", { protein: 10, cost: 5 }), ctx({ lastEaten }));
      return [s.reasons[0] ?? null, s.lastHad];
    };
    expect(at("2026-11-14")).toEqual([null, "Had it today"]);
    expect(at("2026-11-13")).toEqual([null, "Had it yesterday"]);
    expect(at("2026-11-12")).toEqual([null, "Last had 2 days ago"]);
    expect(at("2026-11-11")).toEqual(["Haven't had it in 3 days", "Last had 3 days ago"]);
    expect(at(null)).toEqual(["Not had it in 60+ days", "Not in the last 60 days"]);
  });

  it("shows the numbers for the servings you'll get", () => {
    const s = one(cand("x", { protein: 25, kcal: 480 }), ctx({ servings: 1.5 }));
    expect(s.shown).toEqual({ protein: 37.5, cost: 1.5, kcal: 720 });
    expect(s.proteinChange).toBeCloseTo(1.5);
    expect(s.proteinPerDollar).toBe(25);
  });
});

describe("lastEatenByRecipe", () => {
  it("picks the newest day per recipe, ignoring later days and food entries", () => {
    const rows: EatenRow[] = [
      { day: "2026-11-02", food_id: null, recipe_id: "dal" },
      { day: "2026-11-10", food_id: null, recipe_id: "dal" },
      { day: "2026-11-05", food_id: null, recipe_id: "dal" },
      { day: "2026-11-15", food_id: null, recipe_id: "chili" },
      { day: "2026-11-01", food_id: null, recipe_id: "chili" },
      { day: "2026-11-13", food_id: "oats", recipe_id: null },
    ];
    expect([...lastEatenByRecipe(rows, TODAY)]).toEqual([
      ["dal", "2026-11-10"],
      ["chili", "2026-11-01"],
    ]);
  });
});

describe("hadThisWeek", () => {
  const food = (id: string): Food => ({
    id,
    name: id,
    brand: null,
    barcode: null,
    price: 1,
    package_size: 100,
    unit: "g",
    kcal: 100,
    protein_g: 1,
    carbs_g: 1,
    fat_g: 1,
    ...NO_EXTRAS,
    counts_toward_hydration: false,
  });
  const dal: Recipe = {
    id: "dal",
    name: "Lentil dal",
    servings: 2,
    ingredients: [
      { food: food("lentils"), amount: 200 },
      { food: food("onion"), amount: 100 },
    ],
  };

  it("counts foods logged alone and inside recipes, today and the 6 days before", () => {
    const rows: EatenRow[] = [
      { day: TODAY, food_id: "banana", recipe_id: null },
      { day: "2026-11-08", food_id: null, recipe_id: "dal" },
      { day: "2026-11-07", food_id: "too-old", recipe_id: null },
      { day: "2026-11-15", food_id: "tomorrow", recipe_id: null },
      { day: "2026-11-12", food_id: null, recipe_id: "deleted-recipe" },
    ];
    const k = hadThisWeek(rows, [dal], TODAY);
    expect(k.source).toBe("had-this-week");
    expect([...k.foodIds].sort()).toEqual(["banana", "lentils", "onion"]);
  });
});

describe("swapCurrentFromEntry", () => {
  const entry = { recipe_id: "oats-bowl", name: "Overnight oats", amount: 1.5, protein_g: 36, cost: 1.68 };

  it("divides the entry's own snapshot by its servings", () => {
    const now = swapCurrentFromEntry(entry);
    expect(now.recipeId).toBe("oats-bowl");
    expect(now.protein).toBeCloseTo(24);
    expect(now.cost).toBeCloseTo(1.12);
  });

  it("keeps unknowns unknown, and works when the recipe was deleted", () => {
    expect(swapCurrentFromEntry({ ...entry, recipe_id: null, protein_g: null, cost: null })).toEqual({
      recipeId: null,
      name: "Overnight oats",
      protein: null,
      cost: null,
    });
  });
});
