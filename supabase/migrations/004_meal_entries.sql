-- The daily food log: what you ate, on which day, at which meal.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> Run.
--
-- Snapshots: when you log a food, its name, unit, calories, macros and cost
-- are COPIED into the entry. Editing or deleting the food later never
-- changes a past day. That's also why food_id becomes empty (set null)
-- instead of deleting your history when a food is deleted.
--
-- Missing stays missing: a snapshot macro is null when the food had no
-- value for it, never 0. Totals skip nulls and say how many are missing.
--
-- Recipes come later. They'll add a recipe_id column with a rule of "at
-- most one of food_id and recipe_id". It can't be "exactly one", because
-- an entry whose food was deleted has neither, and that entry is still a
-- real record of what you ate.
--
-- begin ... commit = all or nothing. If any line fails, nothing changes.

begin;

create table public.meal_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  -- A calendar day with no time or timezone, so it can't drift once saved.
  day         date not null,
  meal        text not null
              constraint meal_entries_meal_check
              check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_id     uuid references public.foods (id) on delete set null,

  -- Copied from the food when logged.
  name        text not null
              constraint meal_entries_name_check
              check (char_length(trim(name)) between 1 and 100),
  unit        text not null
              constraint meal_entries_unit_check
              check (unit in ('g', 'ml', 'each')),
  amount      numeric(10, 3) not null
              constraint meal_entries_amount_check
              check (amount > 0 and amount <= 100000),
  -- Only 'eaten' is used for now. 'planned' arrives with the Day/Week plan.
  status      text not null default 'eaten'
              constraint meal_entries_status_check
              check (status in ('planned', 'eaten')),

  -- The snapshot, for this amount. Plain "numeric" (no size limit) so a big
  -- amount can never overflow; precision is handled by the app.
  kcal        numeric constraint meal_entries_kcal_check      check (kcal >= 0),
  protein_g   numeric constraint meal_entries_protein_g_check check (protein_g >= 0),
  carbs_g     numeric constraint meal_entries_carbs_g_check   check (carbs_g >= 0),
  fat_g       numeric constraint meal_entries_fat_g_check     check (fat_g >= 0),
  cost        numeric constraint meal_entries_cost_check      check (cost >= 0),

  created_at  timestamptz not null default now()
);

-- Every screen loads one user's day, so look rows up by (user, day) fast.
create index meal_entries_user_id_day_idx on public.meal_entries (user_id, day);
-- Makes "set food_id to null when a food is deleted" fast.
create index meal_entries_food_id_idx on public.meal_entries (food_id);

alter table public.meal_entries enable row level security;

grant select, insert, update, delete on public.meal_entries to authenticated;

create policy "Users read their own meal entries"
  on public.meal_entries for select to authenticated
  using ((select auth.uid()) = user_id);

-- Adding or changing an entry also checks the food is one of YOURS, so
-- nobody can attach someone else's food id to their log.
create policy "Users add their own meal entries"
  on public.meal_entries for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      meal_entries.food_id is null
      or exists (
        select 1 from public.foods f
        where f.id = meal_entries.food_id and f.user_id = (select auth.uid())
      )
    )
  );

create policy "Users update their own meal entries"
  on public.meal_entries for update to authenticated
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
  );

create policy "Users delete their own meal entries"
  on public.meal_entries for delete to authenticated
  using ((select auth.uid()) = user_id);

commit;
