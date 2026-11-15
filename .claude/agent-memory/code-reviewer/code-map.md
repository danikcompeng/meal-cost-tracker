---
name: code-map
description: Where key Meal Cost Tracker code lives per feature (cost math, recipes, log, targets, barcode, hydration, duplicates) and the migration that added each
metadata:
  type: project
---

Verify paths before citing: this is a snapshot (last updated 2026-11-14).

- lib/cost.ts: pure cost math + money formatting (pricePerUnit, costOfAmount, unitPriceLabel,
  formatMoney, costPerServing, proteinPerDollar(+Text)). cost.test.ts has the worked rice
  example ($4.50 / 2 lb = 907.18474 g -> $0.50 / 100 g, $0.74 per 150 g serving).
- lib/units.ts: BASE_UNITS g/ml/each, EntryUnit adds "serving"; toBaseUnit converts kg->g,
  l->ml at form input, so the DB only stores base units. amountText for rows.
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
