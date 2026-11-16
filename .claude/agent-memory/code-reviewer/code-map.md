---
name: code-map
description: Where key Meal Cost Tracker code lives per feature (cost math, recipes, log, targets, barcode, hydration, duplicates) and the migration that added each
metadata:
  type: project
---

Verify paths before citing: this is a snapshot (last updated 2026-11-15).

- lib/cost.ts: pure cost math + money formatting (pricePerUnit, costOfAmount, unitPriceLabel,
  formatMoney, costPerServing, proteinPerDollar(+Text)). cost.test.ts has the worked rice
  example ($4.50 / 2 lb = 907.18474 g -> $0.50 / 100 g, $0.74 per 150 g serving).
- lib/units.ts: BASE_UNITS g/ml/each, EntryUnit adds "serving"; toBaseUnit converts kg->g,
  l->ml at form input, so the DB only stores base units. amountText for rows; unitWord (singular
  when the 2-dp shown number is "1") and unitWordForTyped (word inside number boxes) since polish 1.
- lib/food-validation.ts (finite numbers, price >= 0, size > 0, cents); lib/foods.ts getFoods /
  getFood / toFood (also used by recipes.ts); numberOrNull + parseDecimal + sumOrNull in numbers.ts.
- lib/server-helpers.ts: requireUser, requireUserId, guarded() (try/catch for actions ->
  friendly message + console.error), logDbError, userToday. server-only.
- Migrations run by hand in the Supabase SQL editor (no CLI), one file per change.
  001 foods (price NOT NULL numeric(10,2), package_size > 0), 003 macros, 004 meal_entries,
  005 zero-kcal, 006 user_settings, 007 barcodes, 008 more nutrients, 009 hydration,
  010 water goal default, 011 recipes.
- Daily log (004): snapshot columns plain numeric; food_id on delete set null. lib/nutrition.ts
  (nutrientsForAmount, snapshotFor, scaleSnapshot, nutrientsFromRow), day-totals.ts, dates.ts,
  entry-validation.ts (checkAmount shared with recipes), recent.ts orderByRecent, entries.ts,
  entry-actions.ts. Today: app/page.tsx (?day=, ?log=), today-view.tsx holds sheet state;
  bottom-sheet.tsx = native <dialog> showModal (restores focus to opener itself).
- Targets (006): lib/targets.ts, settings.ts getTargets, settings-actions.ts, targets-form.tsx,
  day-summary.tsx. Water goal (010): daily_water_ml NOT NULL 2000, show_water; switch-row.tsx.
- Macros (003/008): lib/macros.ts NUTRIENT_KEYS / EXTRA_KEYS / CALORIE_KEYS, macroText,
  basisAmount, calorieHint, kcalGapTooBig; more-nutrients.tsx, nutrient-input.tsx, form-field.tsx.
- Barcode (007): lib/barcode.ts, open-food-facts.ts, scan-actions.ts lookupBarcode, camera.ts,
  barcode-reader.ts; use-barcode-camera.ts, scan-flow.tsx. FoodForm keyed per food in food-manager.
- Hydration (009): lib/hydration.ts (waterForAmount, waterPerServing, waterText), summary.ts,
  progress-ring.tsx, summary-rings.tsx, summary-details.tsx, hydration-switch.tsx.
- Duplicates: lib/food-duplicates.ts, saveFood duplicateChoice/updateExisting, duplicate-dialog.tsx.
- Recipes (plans/recipes.md; 011: PK recipe_id+food_id, food FK deferrable, no on-delete):
  lib/recipes.ts (getRecipes, getRecipe uuid guard, recipeNamesUsingFood), recipe-actions.ts
  (ingredient upsert), recipe-totals.ts (ingredientsMissing, missingNotes, usedInRecipesMessage),
  recipe-validation.ts, nutrientsPerServing / recipeSnapshotFor in nutrition.ts. Kitchen tab ->
  /recipes; kitchen-switch.tsx links /recipes | /foods. Food in a recipe: delete + unit change
  refused in food-actions.ts. Build order: 1 maths, 2 screens, 3 logging from Today.
  Step 3: logRecipe in entry-actions.ts, getRecentRecipeIds in entries.ts, page.tsx filters
  recipes with ingredients; food-picker.tsx groups "Your recipes" + recipe-option.tsx;
  log-recipe-form.tsx (Servings prefilled 1, no autoFocus); MAX_SERVINGS_LOGGED = 20 in
  entry-validation.ts; 011 checks: recipe_id -> unit 'serving', food_id -> unit <> 'serving'.
- Swap (plans/swap.md, no migration): lib/swap.ts swapCandidates, rankSwaps (score() keys:
  protein group, toGet, cost group, recent, gap, cost, -daysSince; then name, id),
  lastEatenByRecipe, hadThisWeek, swapHeaderNotes, constants. daysBetween in dates.ts.
  getEatenHistory(today) in entries.ts (null = failed or hit 1,000 rows; two reads: recipes 60
  days, all 7 days). Build: 1 ranking, 2 card stack from recipe screen, 3 swapEntry/undoSwap.
  Step 2: swap-sheet.tsx (index, Back, counter, live region, end/empty), swap-stack.tsx (shared
  x motion value, leaving ref, animate().then -> onCommit, window arrow keys), swap-card.tsx,
  swap-empty.tsx (SwapEmpty, SwapEnd), swap-button.tsx; recipe-view "swap" sheet, onPick =
  router.push. MotionConfig reducedMotion="user" in recipe-view, recipe-list, scan-flow, today-view.
  Step 3: swapEntry / undoSwap in entry-actions.ts (SwapResult type), validateSwap / swappedFrom /
  validateUndoSwap / UNDO_CHANGED in entry-validation.ts, isUuid in lib/ids.ts,
  swapCurrentFromEntry in swap.ts. today-view.tsx pickSwap (useTransition, returns
  Promise<boolean>) + undo + Toast; undo-toast.tsx (10 s timer, hover/focus pause, status box);
  entry-row.tsx two buttons, data-swap-entry on the shuffle button (Undo focus target).
- Delete + Undo (polish item 4, no migration): deleteEntry returns the row (.delete().select
  DELETED_ENTRY_COLUMNS, toDeletedEntry in entries.ts); restoreEntry inserts it back (same id +
  created_at, 23505 = already back) after validateRestoredEntry (entry-validation.ts). today-view.tsx
  `hidden` id set -> `visible`, swipeDelete / deleteFromSheet / showDeleted / restore, focusLater
  slot; entry-row.tsx drag + red strip + useIsPresent reset; meal-section data-add-meal targets.
- PWA (plans/pwa.md, no migration): lib/app-identity.ts (names, PAGE_BACKGROUND, ICON_GREEN,
  APP_ICONS, appManifest), components/app-icon.tsx (Satori, inline styles), app/icons/[file]/
  route.tsx, app/manifest.ts, layout.tsx metadata/viewport, proxy.ts matcher + proxy.test.ts.
  Steps: 1 manifest/icons/meta, 2 safe areas + 16 px inputs, 3 login code (verifyOtp), 4 Android
  camera help.
- Auth: lib/auth-actions.ts (sendMagicLink, verifyLoginCode, signOut), lib/login-code.ts
  cleanLoginCode (6-10 digits; dashboard OTP length is 8), components/login-form.tsx +
  login-code-form.tsx, app/auth/confirm/route.ts (token_hash link), proxy.ts PUBLIC_PATHS,
  supabase/templates/magic-link.html (pasted by hand into the dashboard; only template in repo).
