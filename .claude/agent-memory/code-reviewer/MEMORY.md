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
- lib/server-helpers.ts: requireUser, requireUserId (claims.sub), guarded() (try/catch wrapper
  for actions -> friendly message + console.error), logDbError, userToday. server-only.
- Daily targets (006_user_settings.sql): user_id PK, 4 integer targets (kcal 1..10000, g 0..1000),
  updated_at; 4 own-row policies (upsert onConflict user_id OK). lib/targets.ts (validateTargets,
  progress, kcalHeadline, targetsHint), lib/settings.ts getTargets, lib/settings-actions.ts
  saveTargets, components/targets-form.tsx, day-summary.tsx (bars), app/settings/page.tsx.
- components/form-field.tsx: shared Field (moved out of food-form). lib/macros.ts has
  kcalFromMacros + kcalGapTooBig (>10 kcal AND >20% of larger), shared by food + targets hints.
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
- More nutrients (plan: plans/more-nutrients.md; 008_more_nutrients.sql): sugar/fiber/sat fat
  numeric(6,1) 0..1000, sodium_mg numeric(7,1) 0..100000 on foods; plain numeric >= 0 on entries.
  lib/macros.ts NUTRIENT_KEYS / EXTRA_KEYS / NO_EXTRAS / CALORIE_KEYS; nutrientsFromRow in
  nutrition.ts (all reads); FIELD_COLUMNS in food-validation.ts maps box names -> columns.
  components/more-nutrients.tsx (collapsed motion.div height 0 + inert, inputs stay in form),
  nutrient-input.tsx; day-summary ExtraNutrients grid gated by hasAnyExtra (day-totals.ts).
- Barcode scanning (plan: plans/barcode-scanning.md; 007_food_barcodes.sql adds barcode 8-14
  digits, brand, source, unique(user_id, barcode)). lib/barcode.ts (check digit, normalize to
  13 / 8 digits), lib/open-food-facts.ts (parseOffResponse, amount() never null->0),
  lib/scan-actions.ts lookupBarcode (own foods first, then OFF, 8 s timeout), lib/camera.ts,
  lib/barcode-reader.ts (ponyfill, wasm at public/zxing/, test checks sha256),
  components/use-barcode-camera.ts (cancelled/finished flags), scan-flow.tsx (requestId).
  FoodForm: hidden barcode input keeps barcode on edit; source only on insert.
  Today ?log=<foodId> opens Log sheet; TodayView key includes logFood id; close() strips URL.
- Rings + hydration (plan: plans/rings-and-hydration.md; 009_hydration.sql: foods.
  counts_toward_hydration bool + check "only ml", meal_entries.water_ml numeric not null default 0,
  user_settings.daily_water_ml 1..10000). lib/hydration.ts (soundsLikeWater \b = SQL \m\M,
  waterForAmount, waterText "<1 ml"/"1.3 L"), lib/summary.ts (summarySlots, showsWater, costLine,
  DETAILS_COOKIE "today_details"). components/progress-ring.tsx (pathLength, aria-hidden),
  summary-rings.tsx, summary-details.tsx, day-summary.tsx (toggle + cookie), hydration-switch.tsx.
  "<1" in totalNumber (day-totals.ts), "<0.1" in macroText.
- Duplicate foods (plan: plans/duplicates-and-water-goal.md s.1, no migration): lib/food-duplicates.ts
  (normalizeName, findDuplicate newest-first, duplicateChanges), saveFood in food-actions.ts
  (barcode pre-check, then name+brand; duplicateChoice "update"/"keep"; updateExisting),
  getFoodsNewestFirst, components/duplicate-dialog.tsx (inside the form, submit buttons).

## Project decisions
- Unit prices for g/ml shown "per 100" ($0.70 / 100 g); "each" shown per item.
- Currency hardcoded to USD (en-US). Not flagged as a bug.
- Inside recipes the UI says "ingredients" on purpose; recipe_ingredients keeps its name.
- "Can't calculate" convention: null, never 0; shown as "—". Keep for cost-per-serving too.
- Macros optional; missing = null = "—". Per-100 g rules only for unit g.
- Log entries snapshot name/unit/macros/cost at log time; editing amount scales the entry's own
  snapshot (never re-reads the food). Totals = known sum + "+ N foods without ...".
- Next 16 error.tsx prop is `retry` (verified in node_modules d.ts), not `reset`. Don't flag.
- 0 kcal rule (005_zero_kcal_macros.sql, fillZeroKcalMacros): kcal 0 + some blank + typed all 0
  -> blanks saved 0. Contradiction (0 kcal, 5 g protein) left null. Entries fixed by own snapshot;
  equivalent to food rule since snapshots never round and amount > 0. Approved, don't re-litigate.
- Users can edit their own snapshot numbers via the raw Supabase API (column-level grants are
  open). Only their own data, accepted; don't raise as security.
- Targets (approved 2026-11-11): whole numbers; blank = null = no target; kcal 0 refused, 0 g
  macro allowed. Over target = plain ink, never red; "Goal reached" protein only. progress()
  uses the ROUNDED total on purpose. Missing kcal -> "up to N left" / "at least N over".
  "Calories today" label when kcal target set. Timezone stays in tz cookie for now.
- Barcode (approved 2026-11-11): OFF called server-side with User-Agent
  "MealCostTracker/0.1 (url)", no email. Scanning your own food -> straight to Log it.
  kJ-only energy converted /4.184 with "Converted from kJ" note. Price always blank after scan.
- More nutrients (approved 2026-11-11): 0 kcal rule fills sugar/fiber/sat fat but NEVER sodium
  (salt is 0 kcal), and sodium > 0 doesn't block the fill. Don't flag. Fiber not compared with
  carbs (US vs EU labels). Sodium per-100 g limit 39,400 (39,300 + slack). Food rows unchanged.
  OFF sodium_100g is grams (x1000); salt-only x400.
- Rings (approved 2026-11-11): small rings show eaten, big ring "kcal left"; switch default on
  for names with the word "water"; only ml counts; cost "at least" with a missing price;
  water_ml 0 never null (no "+ unknown"); details open/closed in a cookie read by app/page.tsx.
  Past days / blank target = number, no ring. Don't re-raise these.
- Duplicates (approved 2026-11-11): native dialog, focus starts on Cancel, max 3 change lines
  + "and N more", price compared per 100 g, newest match offered, editing never asks,
  barcode duplicates keep their "Log that one" message. Don't re-raise.

## Won't fix (do not re-raise)
- formatMoney shows "$0.00" for values < $0.00005 (finding 1c, 2026-11-07).

## Deferred (fix later)
- Targets per day: targets aren't stored per day, so past days show no bars; revisit when
  per-day targets are built (2026-11-11).
- Count "each" drinks toward hydration (decided 2026-11-11): only ml foods can count for now, so
  a "1 bottle" water saved as each can't. Needs ml-per-item on the food. Remind when touching
  hydration (counts_toward_hydration / water_ml).
- "Bought another?" (decided 2026-11-11): when Kitchen/purchases are built, scanning a food you
  already have should offer to record a new purchase (price), not only go to Log it.
  Remind when reviewing the Kitchen/purchases feature or touching lookupBarcode "mine".
- Today ?log= race (finding 6, 2026-11-11, accepted by the developer): closing the scanned food's
  sheet starts router.replace("/"); when it lands, logFood -> null changes TodayView's key and
  remounts it, so a sheet opened in that ~1 s window disappears. Rare; the fix (logFood out of
  the key) risks the sheet not opening after a scan. Don't re-raise unless it's seen in use.

## Review history
- [Review history](review-history.md) — every past review: date, verdict, findings raised (check
  before re-raising). Latest: 2026-11-11 duplicate foods, Minor issues.

## Patterns to watch
- Comments that promise behaviour of another function (e.g. "the hint flags it"): verify them.
- Postgres numeric arrives as string: Number()/numberOrNull at every new Supabase read.
- Cost-per-serving: servings = 0 guard; null price propagates (no `?? 0`).
- Swallowed errors: every new action/read must logDbError before returning a friendly message.
  Repeated in getRecentFoodIds (2026-11-09).
- Server actions that call throwing helpers must be wrapped in guarded() (server-helpers.ts),
  or the throw escapes to error.tsx instead of the form message.
- New tables + by-hand migrations: code that reads a new table breaks prod if pushed before the
  SQL is run. Remind to run the migration first.
- Live hints computed on every keystroke flash for partial numbers (typing 2000 passes 2, 20, 200).
- Rounding then re-scaling stored values compounds error; round only for display.
- Form validation vs DB column precision (numeric(p,s) rounding vs CHECK > 0).
- Async code that outlives its component: after every await, re-check a cancelled flag / request
  id before touching state, the router or a shared variable (camera hook, scan-flow, 2026-11-11).
  Closing a screen should also invalidate in-flight requests.
- UI state derived from a live condition (isOpen = open || hasError) flips back the moment the
  condition clears; if it should stay, latch it into state. Watch hide/inert on focused inputs.
- A saved value the old rules FORCED (false because the unit wasn't ml) isn't the user's choice;
  edit forms that "keep the saved setting" should treat it as untouched (food-form, 2026-11-11).
- <dialog> + React: React removes the element BEFORE the effect cleanup's close(), so the
  browser never restores focus. bottom-sheet.tsx handles it (opener.focus()); new dialogs must too.
  Esc/backdrop handlers should respect `pending` like the buttons do.
- Manual backfills run in the SQL editor bypass RLS (admin role): always scope them by id/user.
- Developer responds well to concrete worked examples (rice test); keep using them.
