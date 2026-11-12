# More nutrients: sugar, fiber, saturated fat, sodium (approved 2026-11-11)

## Decisions
1. Same rules as macros: per basis amount, optional, blank = unknown
   (null), never 0. Sugar, fiber and sat fat in g; sodium in mg.
2. The 0 kcal rule fills blank sugar, fiber and sat fat with 0.
   Sodium stays out of it, both ways: salt has no calories (0 kcal,
   ~39,000 mg sodium per 100 g), so 0 kcal says nothing about sodium,
   and a sodium above 0 doesn't stop the rule. The hint says "Sodium
   stays blank: salt has no calories."
3. Today hides the extras grid when nothing is logged or none of the
   day's entries have any of the four.
4. "sat fat" is the short word on Today; the form says "Saturated fat".
5. The tiny package size fix (reviewer's deferred list) is its own
   small commit right after this one.

## Phone layout
- Food form: the main four stay as they are. Under them a full-width
  44px "More nutrients" row (grey "optional" / "2 of 4 filled" and a
  chevron), collapsed by default. Open: Sugar g · Fiber g / Saturated
  fat g · Sodium mg in the same box style. "Worked out from salt" under
  Sodium when converted. Opens by itself only to show an error. Hidden
  boxes stay in the page so saving never wipes them.
- Today: under the Fat row a 2x2 grid in 13px, value first:
  "12 g sugar · 9 g fiber / 4 g sat fat · 1,840 mg sodium". Number in
  ink, word grey, no bars, no targets. "+ 2 unknown" under a cell when
  some foods lack it; "— sodium" when none have it. Cost line stays last.
- Food rows, entry rows and log/edit previews unchanged.

## Validation (g foods per 100 g where noted)
- Sugar <= carbs, sat fat <= fat (when both filled): errors.
- Each gram value <= 100 per 100 g; sodium <= 39,300 mg per 100 g
  (pure salt). Loose limits for any unit: 1000 g, 100,000 mg.
- Fiber isn't compared with carbs (US labels count it inside carbs,
  EU labels don't), and stays out of the 4/4/9 calorie check.

## Open Food Facts
sugars_100g, fiber_100g, saturated-fat_100g, sodium_100g, salt_100g.
Their sodium is stored in GRAMS (Cheerios: 0.487 = 487 mg per 100 g),
so x 1000. Only salt listed: sodium mg = salt g x 400 (EU labels use
salt = sodium x 2.5, and so does Open Food Facts: Nutella salt 0.107 g
/ 2.5 = sodium 0.0428 g). The "doesn't list" note stays about the main
four only.

## Data (migration 008)
- foods: sugar_g, fiber_g, saturated_fat_g numeric(6,1) 0-1000;
  sodium_mg numeric(7,1) 0-100000 (app rounds to whole mg).
- meal_entries: the same four, plain numeric >= 0.
- Backfill like 005: 0 kcal foods/entries whose macros are all 0 get 0
  sugar, fiber, sat fat. Sodium untouched. Other past entries stay null.
- RLS unchanged. Run 008 BEFORE deploying.

## Files
lib: macros, types, food-validation, food-draft, open-food-facts,
nutrition, day-totals, foods, entries, food-actions (+ tests).
components: food-form, more-nutrients (new), day-summary,
today-skeleton. CLAUDE.md schema and formulas.
