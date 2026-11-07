# Code reviewer memory: Meal Cost Tracker

## Where key code lives
- lib/cost.ts: pure cost math + money formatting (pricePerUnit, unitPriceLabel, formatMoney).
  Recipe cost-per-serving NOT written yet (planned to live here).
- lib/cost.test.ts: Vitest 4 unit tests (`npm test`), incl. a worked rice example
  ($4.50 / 2 lb = 907.18474 g -> $0.50 / 100 g, $0.74 per 150 g serving; math verified).
- lib/units.ts: BASE_UNITS g/ml/each; toBaseUnit converts kg->g, l->ml at form input time.
  So cost math never needs to convert units; DB only stores base units.
- lib/ingredient-validation.ts: pure form validation (finite numbers only, price >= 0,
  size > 0, rounds price to cents).
- lib/ingredients.ts: server-only Supabase read; converts numeric columns with Number().
- supabase/migrations/001_ingredients.sql: ingredients table, RLS on with 4 auth.uid() policies,
  CHECK price >= 0 and package_size > 0. price numeric(10,2), package_size numeric(12,3).
- Callers of lib/cost.ts: components/ingredient-row.tsx (formatMoney + unitPriceLabel),
  components/ingredient-form.tsx (live preview, only rendered when validation passes).

## Project decisions
- Unit prices for g/ml shown "per 100" ($0.70 / 100 g); "each" shown per item.
- Currency hardcoded to USD (en-US). Not flagged as a bug.
- "Can't calculate" convention: pricePerUnit returns null (never 0, since 0 = free);
  unitPriceLabel and formatMoney show "—". Keep this for recipe cost-per-serving too.

## Won't fix (do not re-raise)
- formatMoney shows "$0.00" for values < $0.00005 (finding 1c, 2026-11-07). Developer skipped it.

## Review history
- 2026-11-07 lib/cost.ts: Minor issues. Raised 1a (size <= 0 returned 0), 1b (no NaN/Infinity
  guard), 1c (tiny amounts), 3a (no tests).
- 2026-11-07 re-check: 1a, 1b, 3a fixed and verified (14 tests pass, tsc + lint clean).
  Verdict Looks good. Small notes only: tests don't cover Infinity package size; "—" has no
  screen-reader text in ingredient-row (optional sr-only "price unavailable").

## Patterns to watch
- Postgres numeric arrives as string: check Number() at every new Supabase read.
- When cost-per-serving is added: check servings = 0 guard, amount in base unit, and that a
  null pricePerUnit propagates (whole recipe shows "—") instead of being treated as 0
  (e.g. `?? 0` would reintroduce bug 1a).
- Developer responds well to concrete worked examples (rice test); keep using them.
