# Code reviewer memory: Meal Cost Tracker

## Where key code lives
- lib/cost.ts: pure cost math + money formatting (pricePerUnit, unitPriceLabel, formatMoney).
  Recipe cost-per-serving NOT written yet (planned to live here).
- lib/cost.test.ts: Vitest 4 unit tests (`npm test`), incl. a worked rice example
  ($4.50 / 2 lb = 907.18474 g -> $0.50 / 100 g, $0.74 per 150 g serving; math verified).
- lib/units.ts: BASE_UNITS g/ml/each; toBaseUnit converts kg->g, l->ml at form input time.
  So cost math never needs to convert units; DB only stores base units.
- lib/food-validation.ts: pure form validation (finite numbers only, price >= 0,
  size > 0, rounds price to cents).
- lib/foods.ts: server-only Supabase read; converts numeric columns with Number().
- supabase/migrations/001_ingredients.sql (table renamed to `foods` in 002): RLS on with 4 auth.uid() policies,
  CHECK price >= 0 and package_size > 0. price numeric(10,2), package_size numeric(12,3).
- Callers of lib/cost.ts: components/food-row.tsx (formatMoney + unitPriceLabel),
  components/food-form.tsx (live preview, only rendered when validation passes).
- lib/food-actions.ts: server actions saveFood/deleteFood (requireUser via getClaims).
- Login redirect targets: proxy.ts (logged-in /login -> /foods), app/auth/confirm/route.ts,
  app/page.tsx. next.config.ts has temporary (non-permanent) redirect /ingredients -> /foods.
- Migrations are run by hand in the Supabase SQL editor (no CLI), one file per change.
- Macros (003_food_macros.sql): nullable kcal numeric(7,1) 0..10000, protein/carbs/fat numeric(6,1)
  0..1000, basis_amount GENERATED from unit. lib/macros.ts (macroText, calorieHint, basisChangeNote),
  validateMacros in lib/food-validation.ts, numberOrNull in lib/foods.ts, toField in food-form.
- components/segmented-control.tsx: radio-based, butter highlight on selected (approved use).
- Form posts unit via hidden input; the package-unit select has no name (on purpose).
- FoodForm is remounted per food via key={editing?.id ?? "new"} in components/food-manager.tsx.

## Project decisions
- Unit prices for g/ml shown "per 100" ($0.70 / 100 g); "each" shown per item.
- Currency hardcoded to USD (en-US). Not flagged as a bug.
- Table/feature renamed ingredients -> foods (2026-11-09). Inside recipes the UI still says
  "ingredients" on purpose (CLAUDE.md), and recipe_ingredients keeps its name. Don't flag those.
  Migration 001 deliberately left untouched (history); 002 does the rename.
- "Can't calculate" convention: pricePerUnit returns null (never 0, since 0 = free);
  unitPriceLabel and formatMoney show "—". Keep this for recipe cost-per-serving too.

- Macros optional; missing = null = "—". Per-100 g rules (kcal<=900, macro<=100, sum<=100) only
  for unit g, not ml/each. Calorie hint (4/4/9, >20% AND >10 kcal) never blocks saving.
  Macros are the main row info; price is secondary (13px grey).

## Won't fix (do not re-raise)
- formatMoney shows "$0.00" for values < $0.00005 (finding 1c, 2026-11-07). Developer skipped it.

## Deferred (fix later, remind when touching food validation)
- Tiny package sizes (e.g. 0.0001 g) pass lib/food-validation.ts but round to 0.000 in
  numeric(12,3) and fail the CHECK > 0, so the user sees only "Couldn't save." (finding 3d,
  2026-11-09). Developer chose to leave it for later, not won't-fix. Planned fix: reject
  sizes where Math.round(base.amount * 1000) === 0, plus a test.

## Review history
- 2026-11-07 lib/cost.ts: Minor issues. Raised 1a (size <= 0 returned 0), 1b (no NaN/Infinity
  guard), 1c (tiny amounts), 3a (no tests).
- 2026-11-07 re-check: 1a, 1b, 3a fixed and verified (14 tests pass, tsc + lint clean).
  Verdict Looks good. Small notes only: tests don't cover Infinity package size; "—" has no
  screen-reader text in food-row (optional sr-only "price unavailable"; since added).
- 2026-11-09 ingredients -> foods rename (staged): Minor issues. Migration SQL correct. Raised:
  run migration + deploy back to back (old code breaks in between, preview deploys share DB);
  pre/post check queries; stale /ingredients in notes.md:39; validation tests miss the
  100-char boundary, "" name, "Infinity", and tiny sizes that round to 0 in numeric(12,3);
  pre-existing: food-actions.ts drops Supabase error without console.error.
  Fixed same day: notes.md route, all 4 test gaps, and food-actions.ts now logs message/code/
  details/hint via logDbError while still showing the friendly message. 3d deferred (above).
- 2026-11-09 add macros to foods (uncommitted): Minor issues. No null->0 leaks, app limits match DB
  CHECKs. Raised: editing one macro after a unit switch clears the unit note for all four;
  run 003 before deploying (getFoods selects new columns); row shows "per 100 g" next to the
  price (reads as price basis); segmented track bg-muted == bg-card (#F0F0F0, invisible);
  segments 36px tall; calorieHint 20% uses max(kcal, estimate), test comment says 25%;
  reminded about deferred 3d.

## Patterns to watch
- Postgres numeric arrives as string: check Number() at every new Supabase read.
- When cost-per-serving is added: check servings = 0 guard, amount in base unit, and that a
  null pricePerUnit propagates (whole recipe shows "—") instead of being treated as 0
  (e.g. `?? 0` would reintroduce bug 1a).
- Swallowed Supabase errors: actions return a friendly message but never log error.message
  server-side. Check every new server action for console.error.
- Form validation vs DB column precision: JS accepts values the numeric(p,s) column rounds
  or rejects (0.0001 g -> 0.000 fails CHECK > 0, shows only a generic "Couldn't save").
- Developer responds well to concrete worked examples (rice test); keep using them.
