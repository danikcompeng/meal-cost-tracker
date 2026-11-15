# Recipes (approved 2026-11-14)

Answers: "—" for recipes, written into CLAUDE.md as the one rule.
Kitchen tab opening on [ Recipes | Foods ]; existing /foods links keep
working. steps column in 011, no Steps box yet. No Playwright for now:
unit tests + the phone checklist. Drained cooking water: left out of
recipes by default, and the hint under the amount says so when you add
a food that counts toward hydration (Water) to a recipe:
"Counts toward water: 250 ml. Leave out water you drain away."
You'll set your Water food's sodium to 0 mg yourself.

A recipe is a named list of your foods with amounts, plus how many
servings it makes. It shows cost and all 8 nutrients per serving, and
you can log it to Today by servings (1.5). Migration 011.

## 0. Decisions to confirm first

1. **"—" instead of "+ N unknown" for recipes.** CLAUDE.md currently
   says per-serving totals count unknowns "the same '+ N unknown' way".
   Your brief says: one missing value makes that total "—". I'll follow
   the brief and update CLAUDE.md. What that looks like:
   - Recipe screen: "— protein", and a quiet line under it naming the
     cause: "Unknown because Water has no sodium". No partial number.
   - Logged to Today: that nutrient is saved as unknown (null), so Today
     shows it the usual way: "+ 1 food without sodium". Today never
     receives a lower number that quietly left an ingredient out.
   - Side effect to expect: your Water food probably has sodium blank
     (the 0 kcal rule never fills sodium), so every recipe with water
     will show sodium "—" until you type 0 mg on Water.
2. **Tab bar: Recipes goes in a "Kitchen" tab (section 4).**
3. **Steps:** the `steps` column is in CLAUDE.md, so the migration adds
   it, but this feature has no steps box yet. Add a plain "Steps" text
   box now, or later?
4. **Playwright isn't installed yet** (no dependency or config in the
   repo). I'll add unit tests (vitest) plus a manual phone checklist.
   Setting up Playwright would be its own small step, if you want it.

## 1. Phone layouts

All screens: 16 px side margins, white background, grey rounded tiles,
the tab bar at the bottom, every number tabular.

### Recipes list (`/recipes`)
- Header as on other tabs: "Recipes" (30 px bold), Settings · Log out.
- Under it, the Kitchen switch: `[ Recipes | Foods ]` (butter yellow on
  the current one), linking `/recipes` and `/foods`.
- A full-width matcha "New recipe" button (44 px tall).
- One tile per recipe, recently logged first, then A to Z:
  ```
  Overnight oats                           $1.12
  412 kcal · 24 g protein              per serving
  21 g protein per $  ·  4 servings
  ```
  Name medium 16 px; cost right-aligned, medium; protein in matcha;
  the rest 13 px grey. Unknown price: "—" with "no price yet" under it,
  and no protein per $. A recipe with no ingredients: "No ingredients
  yet" in grey instead of the numbers.
- New recipe opens a bottom sheet: Name, "Makes … servings" (prefilled
  1, decimals like 2.5 allowed), "Create". Then you land on the new
  recipe's screen to add ingredients. Each ingredient saves the moment
  you add it, so nothing is lost if the phone locks halfway.
- States: loading = three grey tile shapes. First use (no recipes):
  a tile "Your staple meals go here. Put a few foods together once,
  then log the whole meal with one tap." + "New recipe". No foods yet
  either: the button becomes "Add foods first" (goes to Foods). Error:
  the existing error screen.

### Recipe screen (`/recipes/[id]`)
Top to bottom:
1. "‹ Recipes" quiet back link; recipe name (30 px bold) with a quiet
   "Edit" link (sheet: name, servings, "Delete recipe" with "Days you
   logged it keep their numbers").
2. The one big number: 13 px grey label "Cost per serving", then
   "$1.12" (48 px bold matcha). Under it, grey: "Makes 4 servings ·
   $4.48 in total" and "21 g protein per $" (matcha, medium).
   Unknown: big "—" and "Rolled oats has no price yet".
3. "Per serving" tile: kcal, protein (matcha), carbs, fat in a 2 x 2
   grid, number medium, grey word under it. Then "More nutrients" small
   and quiet: sugar, fiber, sat fat, sodium on one or two lines. Each
   "—" gets one grey line naming who's missing it: "Unknown because Oat
   milk and Banana have no fiber" (two names, then "and 1 more").
4. "Ingredients · 3" (13 px grey label), then one row per ingredient,
   in the order you added them:
   ```
   Rolled oats                               $0.74
   150 g · 19.5 g protein
   ```
   These are for the whole recipe (what goes in the pot), not per
   serving. Tap a row: sheet to change the amount or remove it.
5. Dashed "+ Add ingredient" button, like Today's "+ Add to lunch".
- Empty recipe: the big number shows "—" with "Add an ingredient to see
  the cost", the nutrient tile is hidden, and "+ Add ingredient" sits
  right under the header.
- Someone else's id, or a deleted recipe: "This recipe doesn't exist
  anymore" + back link.

### Adding an ingredient (bottom sheet on the recipe screen)
- Step 1: the same food picker as Today (search box, recently logged
  first). A food already in the recipe says "In recipe · 150 g" and
  opens its edit sheet instead (each food appears once per recipe).
- Step 2: food name, the amount box in the food's own unit ("150  g"),
  and the live line "= 568 kcal · 19.5 g protein · $0.74". For a food
  that counts toward hydration, one more grey line: "Counts toward
  water: 250 ml". "Add" saves it and returns to step 1 with "Added
  Rolled oats" above the list, so the next one is one tap away. "Done"
  or ✕ closes.
- Water rule (your brief): an ingredient adds water only if its food
  has "Counts toward hydration" on, exactly as when logging the food.
  Plain-language catch: pasta water you drain away would count too if
  you add your Water food. Leave drained water out, or make a "Cooking
  water" food with the switch off.

### Logging from Today
- "+ Add to lunch" opens the sheet as now. One search box filters two
  groups: "Your recipes" first (recently logged first), then "Foods".
  Recipe rows: "412 kcal · 24 g protein · $1.12 per serving". Recipes
  with no ingredients are left out. No recipes yet: the group doesn't
  show (the sheet looks exactly like today).
- Pick a recipe: name, a "Servings" box prefilled with 1, the live line
  "= 618 kcal · 36 g protein · $1.68" for what you typed, the meal
  switch, "Log it". One tap for your usual single serving.
- On Today it's a normal row: "Overnight oats" / "1.5 servings · 36 g
  protein" / "618 kcal". Tap to change servings or meal, or delete:
  this already works, it scales the saved snapshot (1 → 1.5 = x 1.5).

## 2. Snapshot rules (why past days never change)
- When you log, the server reads the recipe and its foods from the
  database (never numbers sent by the phone), works out per serving,
  multiplies by your servings, and copies the result into the entry:
  all 8 nutrients, cost, water_ml, plus name = the recipe's name and
  unit = "serving". Stored like every other entry (totals for what you
  ate), so Today's adding-up doesn't change at all.
- Recipes themselves are live: change a food's price or protein and the
  recipe screen updates. Logged days keep their copy.
- Per serving = sum over ingredients / servings. Any ingredient missing
  a value makes it unknown (null). Cost per ingredient = the existing
  `costOfAmount`, nutrients = the existing `nutrientsForAmount`, water =
  the existing `waterForAmount`. Nothing is rounded until the screen.
- Deleting a recipe keeps past entries (recipe_id becomes empty).
- **Deleting a food that's in a recipe is refused**: "Rolled oats is in
  Overnight oats. Remove it there first." Silently dropping it would
  make the recipe cheaper and lighter than it really is.
- **Changing a food's unit (g → each) is refused while it's in a
  recipe**: "150" would suddenly mean 150 items. Same message style,
  shown under the unit box.

## 3. Migration `supabase/migrations/011_recipes.sql`
Saved as a file once you approve. Run it BEFORE deploying (the new code
asks for `recipe_id`). The old code keeps working after it runs.

```sql
-- Recipes: your own staple meals, made from your foods.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> Run.
-- Run it BEFORE deploying the code that uses it: that code asks for
-- meal_entries.recipe_id, which doesn't exist until this runs, so Today
-- would fail to load. The old code keeps working after it runs.
--
-- recipes: a name and how many servings it makes (decimals allowed, so
--   2.5 works). steps is optional text for later.
--
-- recipe_ingredients: which of your foods, and how much, in the food's
--   own unit (g, ml or items) for the WHOLE recipe. Each food appears
--   once per recipe (primary key = recipe + food), so adding oats twice
--   means changing the amount instead. No user_id: you own an
--   ingredient row by owning its recipe (and its food).
--   - Delete a recipe and its ingredient rows go with it (cascade).
--   - Delete a FOOD that's still in a recipe and Postgres refuses
--     (a reference with no "on delete" rule). "deferrable initially
--     deferred" makes it check at the very end of the save, not the
--     moment the food row goes. That matters for one case: deleting
--     your whole account removes your foods AND your recipes in one go,
--     in no guaranteed order. Checked at the end, the recipes (and so
--     their ingredient rows) are gone too, nothing points at the foods,
--     and it succeeds. Checked straight away, it could block deleting
--     your account.
--
-- meal_entries.recipe_id: set when you log a recipe. Delete the recipe
--   and it becomes empty (set null); the entry keeps its copied name and
--   numbers, like entries whose food was deleted. An entry points at a
--   food OR a recipe OR (after a delete) neither, never both. A recipe
--   entry is measured in servings, so 'serving' joins g / ml / each.
--
-- Row Level Security: everything is your own rows only. Policies are
--   rules Postgres checks on every read and write from the app; "using"
--   decides which rows you can see or touch, "with check" decides what
--   a new or changed row is allowed to look like.
--
-- begin ... commit = all or nothing. If any line fails, nothing changes.
-- Running it a second time fails on the first line and changes nothing.

begin;

-- 1. Recipes ---------------------------------------------------------

create table public.recipes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  name        text not null
              constraint recipes_name_check
              check (char_length(trim(name)) between 1 and 100),
  servings    numeric(6, 2) not null
              constraint recipes_servings_check
              check (servings > 0 and servings <= 100),
  steps       text
              constraint recipes_steps_check
              check (char_length(steps) <= 5000),
  created_at  timestamptz not null default now()
);

create index recipes_user_id_idx on public.recipes (user_id);

alter table public.recipes enable row level security;

grant select, insert, update, delete on public.recipes to authenticated;

create policy "Users read their own recipes"
  on public.recipes for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users add their own recipes"
  on public.recipes for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own recipes"
  on public.recipes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own recipes"
  on public.recipes for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 2. Recipe ingredients ----------------------------------------------

create table public.recipe_ingredients (
  recipe_id   uuid not null
              references public.recipes (id) on delete cascade,
  food_id     uuid not null
              references public.foods (id) deferrable initially deferred,
  amount      numeric(10, 3) not null
              constraint recipe_ingredients_amount_check
              check (amount > 0 and amount <= 100000),
  -- Keeps ingredients in the order you added them.
  created_at  timestamptz not null default now(),
  primary key (recipe_id, food_id)
);

-- The primary key already finds a recipe's ingredients fast. This one
-- makes "is this food in any recipe?" fast (deleting a food asks it).
create index recipe_ingredients_food_id_idx on public.recipe_ingredients (food_id);

alter table public.recipe_ingredients enable row level security;

grant select, insert, update, delete on public.recipe_ingredients to authenticated;

create policy "Users read their own recipe ingredients"
  on public.recipe_ingredients for select to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id and r.user_id = (select auth.uid())
    )
  );

-- Adding or changing needs BOTH: the recipe is yours AND the food is
-- yours, so nobody can put someone else's food in a recipe.
create policy "Users add ingredients to their own recipes"
  on public.recipe_ingredients for insert to authenticated
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id and r.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.foods f
      where f.id = recipe_ingredients.food_id and f.user_id = (select auth.uid())
    )
  );

create policy "Users update their own recipe ingredients"
  on public.recipe_ingredients for update to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id and r.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id and r.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.foods f
      where f.id = recipe_ingredients.food_id and f.user_id = (select auth.uid())
    )
  );

create policy "Users delete their own recipe ingredients"
  on public.recipe_ingredients for delete to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id and r.user_id = (select auth.uid())
    )
  );

-- 3. Logging a recipe ------------------------------------------------

alter table public.meal_entries
  add column recipe_id uuid
    references public.recipes (id) on delete set null;

-- Makes "set recipe_id to null when a recipe is deleted" fast, and
-- "recipes you logged lately" for the picker's order.
create index meal_entries_recipe_id_idx on public.meal_entries (recipe_id);

alter table public.meal_entries drop constraint meal_entries_unit_check;

alter table public.meal_entries
  add constraint meal_entries_unit_check
    check (unit in ('g', 'ml', 'each', 'serving')),
  -- num_nonnulls counts how many are filled in: 0 or 1, never 2.
  add constraint meal_entries_one_source_check
    check (num_nonnulls(food_id, recipe_id) <= 1),
  -- Recipes are logged in servings, foods never are.
  add constraint meal_entries_recipe_unit_check
    check (recipe_id is null or unit = 'serving'),
  add constraint meal_entries_food_unit_check
    check (food_id is null or unit <> 'serving');

-- The two meal_entries policies that check "the food is yours" now also
-- check "the recipe is yours". "alter policy" swaps the rule in place.
alter policy "Users add their own meal entries" on public.meal_entries
  with check (
    (select auth.uid()) = user_id
    and (
      meal_entries.food_id is null
      or exists (
        select 1 from public.foods f
        where f.id = meal_entries.food_id and f.user_id = (select auth.uid())
      )
    )
    and (
      meal_entries.recipe_id is null
      or exists (
        select 1 from public.recipes r
        where r.id = meal_entries.recipe_id and r.user_id = (select auth.uid())
      )
    )
  );

alter policy "Users update their own meal entries" on public.meal_entries
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      meal_entries.food_id is null
      or exists (
        select 1 from public.foods f
        where f.id = meal_entries.food_id and f.user_id = (select auth.uid())
      )
    )
    and (
      meal_entries.recipe_id is null
      or exists (
        select 1 from public.recipes r
        where r.id = meal_entries.recipe_id and r.user_id = (select auth.uid())
      )
    )
  );

commit;

-- To check afterwards (4 policies each for recipes, recipe_ingredients
-- and meal_entries):
--   select tablename, policyname, cmd from pg_policies
--   where schemaname = 'public'
--     and tablename in ('recipes', 'recipe_ingredients', 'meal_entries')
--   order by tablename, cmd;
```

## 4. Tab bar: Today · (Scan) · Kitchen
Adding a fourth item breaks the balance: Scan is the raised button in
the middle, so a third text tab pushes it off-centre, and at 375 px
four pills don't fit at their current size.

So the bar stays three slots. "Foods" becomes **Kitchen**, and Kitchen
opens on a `[ Recipes | Foods ]` switch at the top of both screens
(links to `/recipes` and `/foods`, styled like the segmented control).
Kitchen is highlighted on both. It opens on Recipes, the screen you'll
use more.
Why it fits: recipes are made from your foods, and "what's in my
kitchen" (feature 4) will live on Foods too, so it's one home for
everything you own.

Alternative, if you'd rather see "Recipes" on the bar itself: smaller
icon-over-word tabs, Today · Recipes · (Scan) · Foods · and a fifth
slot that waits for Week. Until Week exists one side is emptier.

## 5. Files

New
- `supabase/migrations/011_recipes.sql`
- `app/recipes/page.tsx`: list. `app/recipes/[id]/page.tsx`: recipe
  screen. `app/recipes/[id]/not-found.tsx`. (I'll read the Next 16
  docs on dynamic routes in node_modules first, as AGENTS.md asks.)
- `lib/recipes.ts` (server-only reads: getRecipes, getRecipe with
  ingredients and their foods in one query, recipeNamesUsingFood)
- `lib/recipe-actions.ts` (create, update, delete recipe; save and
  remove ingredient)
- `lib/recipe-validation.ts`: name, servings, ingredient amount
- `lib/recipe-totals.ts`: per serving for the screens, including which
  ingredients are missing each value (for the "Unknown because" line)
- `components/kitchen-switch.tsx`, `recipe-list.tsx`, `recipe-tile.tsx`,
  `recipe-form.tsx` (name + servings, new and edit), `recipe-view.tsx`
  (client: which sheet is open), `recipe-cost.tsx` (the big number),
  `recipe-nutrients.tsx`, `ingredient-row.tsx`, `ingredient-form.tsx`
  (add and change amount), `log-picker.tsx` (recipes + foods on Today),
  `log-recipe-form.tsx`, `recipes-skeleton.tsx`

Changed
- `lib/cost.ts`: `costPerServing`, `proteinPerDollar` (hidden when cost
  is 0 or unknown)
- `lib/nutrition.ts`: `nutrientsPerServing`, `recipeSnapshotFor`
- `lib/hydration.ts`: `waterPerServing`
- `lib/numbers.ts`: `sumOrNull` (null if any value is null)
- `lib/units.ts`: `EntryUnit` (= g / ml / each / serving); amountText
  "1 serving", "1.5 servings"
- `lib/types.ts`: Recipe, RecipeIngredient; MealEntry gets recipe_id
- `lib/entries.ts`: read recipe_id; getRecentRecipeIds
- `lib/entry-validation.ts`: validateNewRecipeEntry (servings above 0,
  at most 20)
- `lib/entry-actions.ts`: logRecipe
- `lib/food-actions.ts`: refuse deleting a food in a recipe, refuse a
  unit change while in a recipe, refresh /recipes after a food changes
- `app/page.tsx`, `components/today-view.tsx`: load and offer recipes
- `components/amount-field.tsx`: "servings" suffix and "Servings" label
- `components/food-picker.tsx`: optional "In recipe · 150 g" note
- `components/tab-bar.tsx`, `app/foods/page.tsx`: Kitchen + switch
- `CLAUDE.md`: the "—" rule, recipe_ingredients columns, unit
  'serving', delete/unit rules, tab bar

## 6. Tests (vitest)
- `cost.test.ts`: per serving = total / servings (2.5 servings too);
  one ingredient without a price → null, never a smaller number; empty
  recipe → null; protein per $ hidden for cost 0, unknown cost or
  unknown protein.
- `nutrition.test.ts`: all 8 nutrients per serving with g, ml and each
  foods; one blank → only that nutrient null, the other 7 still work;
  a real 0 stays 0; snapshot for 1.5 servings = 1.5 x per serving, name
  copied, unit "serving", nothing rounded.
- `hydration.test.ts`: only ml foods with the switch on add water;
  "Cooking water" with the switch off adds 0; never null.
- `numbers.test.ts`: sumOrNull with all known, one null, empty list.
- `recipe-totals.test.ts`: names in "Unknown because" (one, two, "and
  1 more"); empty recipe.
- `recipe-validation.test.ts`: blank or 101-letter name; servings 0,
  -1, "1,000" (ambiguous comma), 2.5 ok, 101 refused, 0.001 refused;
  ingredient amount like entries.
- `entry-validation.test.ts`: servings 1.5 ok, 0 and 21 refused.
- `units.test.ts`: "1 serving", "1.5 servings".
- `nutrition.test.ts` (scaleSnapshot): a recipe entry 1 → 1.5 servings.

Manual check on your phone (until Playwright exists): create a recipe,
add 3 ingredients, see a "—" when one has no fiber, log 1.5 servings,
edit a food's price and confirm the recipe changes but Today doesn't,
try deleting a food that's in a recipe, check dark mode and 375 px.

## 7. Build order (one commit each)
1. Migration + the pure math + tests (you run 011).
2. Kitchen switch, Recipes list, recipe screen, ingredients.
3. Logging from Today.
I'll stop after step 2 so you can try it on your phone.

Not in this feature: the "I'm tired of this" swap, planning onto days,
protein per $ for the whole day, steps (unless you say yes above).
