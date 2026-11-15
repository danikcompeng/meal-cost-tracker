-- Recipes: your own staple meals, made from your foods.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> Run.
-- Run it BEFORE deploying the code that uses it: that code asks for
-- meal_entries.recipe_id, which doesn't exist until this runs, so Today
-- would fail to load. The old code keeps working after it runs.
--
-- recipes: a name and how many servings it makes (decimals allowed, so
--   2.5 works). steps is optional text, not used by the app yet.
--
-- recipe_ingredients: which of your foods, and how much, in the food's
--   own unit (g, ml or items) for the WHOLE recipe. Each food appears
--   once per recipe (primary key = recipe + food), so adding oats twice
--   means changing the amount instead. No user_id: you own an
--   ingredient row by owning its recipe (and its food).
--   - Delete a recipe and its ingredient rows go with it (cascade).
--   - Delete a FOOD that's still in a recipe and Postgres refuses
--     (a reference with no "on delete" rule). The app checks first and
--     says which recipe it's in; this is the safety net underneath.
--     "deferrable initially deferred" makes Postgres check at the very
--     end of the save, not the moment the food row goes. That matters
--     for one case: deleting your whole account removes your foods AND
--     your recipes in one go, in no guaranteed order. Checked at the
--     end, the recipes (and so their ingredient rows) are gone too,
--     nothing points at the foods, and it succeeds. Checked straight
--     away, it could block deleting your account.
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
