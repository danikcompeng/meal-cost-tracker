-- Hydration: which foods count as water, how much water each log entry
-- adds, and an optional daily water goal.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> Run.
-- Run it BEFORE deploying the code that uses these columns: that code asks
-- the database for them, and until this runs they don't exist, so Today,
-- Foods and Settings would fail to load.
--
-- foods.counts_toward_hydration: the "Counts toward hydration" switch.
--   Only foods measured in ml can count (a check rule makes sure), because
--   their amount IS the water in ml. Existing ml foods with the word
--   "water" in their name start switched on, like new ones do in the app.
--   (\m and \M mean "start of a word" and "end of a word", so "Water" and
--   "Sparkling water" match but "Watermelon" doesn't. ~* ignores case.)
--
-- meal_entries.water_ml: a snapshot like the nutrients, copied when you
--   log, so changing the food later never changes a past day. It's 0 for
--   foods that don't count, never null: a food that doesn't hydrate adds
--   nothing, it isn't "unknown". So water never shows "+ unknown".
--   Past entries get 0.
--
-- user_settings.daily_water_ml: optional goal in ml. Blank = no goal (no
--   ring, just the total). 0 is refused, like a 0 kcal target.
--
-- Row Level Security is unchanged: policies cover whole rows, so the new
-- columns are protected automatically.
--
-- begin ... commit = all or nothing. If any line fails, nothing changes.

begin;

alter table public.foods
  add column counts_toward_hydration boolean not null default false;

update public.foods
set counts_toward_hydration = true
where unit = 'ml' and name ~* '\mwater\M';

alter table public.foods
  add constraint foods_counts_toward_hydration_check
    check (not counts_toward_hydration or unit = 'ml');

alter table public.meal_entries
  add column water_ml numeric not null default 0
    constraint meal_entries_water_ml_check check (water_ml >= 0);

alter table public.user_settings
  add column daily_water_ml integer
    constraint user_settings_daily_water_ml_check
    check (daily_water_ml between 1 and 10000);

commit;

-- To check afterwards (lists the foods that count toward hydration):
--   select name, unit, counts_toward_hydration from public.foods
--   where counts_toward_hydration;
--
-- OPTIONAL, LATER: water you logged while your Water food was measured in
-- g. First switch that food to ml in the app (Foods -> Water -> ml, and
-- "Counts toward hydration" on). Then run this on its own. It gives each
-- of those past entries its amount as water, since 1 g of water is 1 ml.
-- It only touches entries logged in g, with no water yet, for a food that
-- now counts toward hydration. The SQL editor skips Row Level Security, so
-- the "where" is what keeps this to the right rows.
--   update public.meal_entries e
--   set water_ml = e.amount
--   from public.foods f
--   where e.food_id = f.id
--     and f.counts_toward_hydration
--     and e.unit = 'g'
--     and e.water_ml = 0;
