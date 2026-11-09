# Code reviewer memory: Meal Cost Tracker

## Where key code lives
- lib/cost.ts: pure cost math + money formatting (pricePerUnit, costOfAmount, unitPriceLabel,
  formatMoney). Recipe cost-per-serving NOT written yet (planned to live here).
- lib/cost.test.ts: Vitest 4 unit tests (`npm test`), incl. a worked rice example
  ($4.50 / 2 lb = 907.18474 g -> $0.50 / 100 g, $0.74 per 150 g serving; math verified).
- lib/units.ts: BASE_UNITS g/ml/each; toBaseUnit converts kg->g, l->ml at form input time.
  So cost math never needs to convert units; DB only stores base units. amountText for rows.
- lib/food-validation.ts: pure form validation (finite numbers only, price >= 0,
  size > 0, rounds price to cents).
- lib/foods.ts: server-only reads getFoods/getFood; numberOrNull (lib/numbers.ts) for macros.
- supabase/migrations/001_ingredients.sql (table renamed to `foods` in 002): RLS on with 4 auth.uid() policies,
  CHECK price >= 0 and package_size > 0. price numeric(10,2), package_size numeric(12,3).
- lib/server-helpers.ts: requireUser, logDbError, userToday (server-only, NOT "use server").
- lib/food-actions.ts saveFood/deleteFood; lib/entry-actions.ts logFood/updateEntry/deleteEntry.
- Daily log (004_meal_entries.sql): snapshot columns plain numeric; food_id on delete set null;
  insert/update policies also require food_id to be the user's own food.
  lib/nutrition.ts (nutrientsForAmount, snapshotFor, scaleSnapshot), lib/day-totals.ts,
  lib/dates.ts (todayIn, isLoggableDay = 2000..today+1), lib/entry-validation.ts, lib/recent.ts.
- Today screen: app/page.tsx (?day=), components/today-view.tsx holds sheet state;
  components/bottom-sheet.tsx = native <dialog> showModal. tz cookie via timezone-sync.tsx.
- Login now redirects to "/" (proxy.ts, app/auth/confirm/route.ts).
- Migrations are run by hand in the Supabase SQL editor (no CLI), one file per change.
- Macros (003_food_macros.sql): nullable kcal numeric(7,1) 0..10000, protein/carbs/fat numeric(6,1)
  0..1000, basis_amount GENERATED from unit. lib/macros.ts (macroText, basisAmount, calorieHint).
- components/segmented-control.tsx: radio-based, butter highlight on selected (approved use).
- FoodForm is remounted per food via key={editing?.id ?? "new"} in components/food-manager.tsx.

## Project decisions
- Unit prices for g/ml shown "per 100" ($0.70 / 100 g); "each" shown per item.
- Currency hardcoded to USD (en-US). Not flagged as a bug.
- Inside recipes the UI says "ingredients" on purpose; recipe_ingredients keeps its name.
- "Can't calculate" convention: null, never 0; shown as "—". Keep for cost-per-serving too.
- Macros optional; missing = null = "—". Per-100 g rules only for unit g.
- Log entries snapshot name/unit/macros/cost at log time; editing amount scales the entry's own
  snapshot (never re-reads the food). Totals = known sum + "+ N foods without ...".
- Next 16 error.tsx prop is `retry` (verified in node_modules d.ts), not `reset`. Don't flag.
- Users can edit their own snapshot numbers via the raw Supabase API (column-level grants are
  open). Only their own data, accepted; don't raise as security.

## Won't fix (do not re-raise)
- formatMoney shows "$0.00" for values < $0.00005 (finding 1c, 2026-11-07).

## Deferred (fix later, remind when touching food validation)
- Tiny package sizes (e.g. 0.0001 g) round to 0.000 in numeric(12,3) and fail CHECK > 0 with
  only "Couldn't save." (finding 3d, 2026-11-09). Planned fix: reject Math.round(x*1000)===0.
  (Entry amounts already do this correctly in parseAmount.)

## Review history
- 2026-11-07 lib/cost.ts: 1a/1b/3a fixed, verified. Looks good.
- 2026-11-09 rename ingredients -> foods: Minor issues, fixed same day except 3d.
- 2026-11-09 macros on foods: Minor issues (unit-note clearing, segmented track invisible,
  36px segments, calorieHint comment 20% vs 25%).
- 2026-11-09 daily food log (uncommitted): Minor issues. RLS correct, no Number(null) leaks,
  updateEntry can't change day/food. Raised: scaleSnapshot multiplies already-rounded snapshot
  (drift on edit, rice 1 g -> 500 g = $2.50 vs $2.48); thrown errors in actions (getFood/getEntry/
  requireUser) hit error.tsx instead of form message; PWA left open past midnight logs to
  yesterday (stale hidden day); foods empty + entries exist -> picker says 'No food called ""';
  parseAmount "1,000" -> 1; getRecentFoodIds swallows error unlogged; sheet focus not returned
  on unmount (unsure); confirm route doesn't log auth errors.

## Patterns to watch
- Postgres numeric arrives as string: Number()/numberOrNull at every new Supabase read.
- Cost-per-serving: servings = 0 guard; null price propagates (no `?? 0`).
- Swallowed errors: every new action/read must logDbError before returning a friendly message.
  Repeated in getRecentFoodIds (2026-11-09).
- Server actions that call throwing read helpers (getFood/getEntry throw) escape to error.tsx;
  check for try/catch in actions.
- Rounding then re-scaling stored values compounds error; round only for display.
- Form validation vs DB column precision (numeric(p,s) rounding vs CHECK > 0).
- Developer responds well to concrete worked examples (rice test); keep using them.
