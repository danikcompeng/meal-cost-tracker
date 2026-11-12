-- Sugar, fiber, saturated fat and sodium, on foods and on log entries.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> Run.
-- Run it BEFORE deploying the code that uses these columns: that code asks
-- the database for them, and until this runs they don't exist, so Today
-- and Foods would fail to load.
--
-- Same rules as the macros (003): per basis amount (100 g, 100 ml or 1
-- item), optional, and missing stays missing. No default, so existing
-- foods and past entries get null ("not entered"), never 0. Sugar, fiber
-- and saturated fat are in grams; sodium is in mg, like on labels.
--
-- Limits are loose on purpose, as in 003 (an "each" food can be a whole
-- pizza). The app checks the stricter rules before saving: sugar is part
-- of carbs, saturated fat part of fat, and per 100 g, at most 100 g or,
-- for sodium, about 39,300 mg (pure salt).
--
-- Row Level Security is unchanged: policies cover whole rows, so the new
-- columns are protected automatically.
--
-- begin ... commit = all or nothing. If any line fails, nothing changes.

begin;

alter table public.foods
  add column sugar_g numeric(6, 1)
    constraint foods_sugar_g_check check (sugar_g between 0 and 1000),
  add column fiber_g numeric(6, 1)
    constraint foods_fiber_g_check check (fiber_g between 0 and 1000),
  add column saturated_fat_g numeric(6, 1)
    constraint foods_saturated_fat_g_check check (saturated_fat_g between 0 and 1000),
  add column sodium_mg numeric(7, 1)
    constraint foods_sodium_mg_check check (sodium_mg between 0 and 100000);

-- Snapshots for this amount, plain numeric like the macros in 004.
alter table public.meal_entries
  add column sugar_g numeric
    constraint meal_entries_sugar_g_check check (sugar_g >= 0),
  add column fiber_g numeric
    constraint meal_entries_fiber_g_check check (fiber_g >= 0),
  add column saturated_fat_g numeric
    constraint meal_entries_saturated_fat_g_check check (saturated_fat_g >= 0),
  add column sodium_mg numeric
    constraint meal_entries_sodium_mg_check check (sodium_mg >= 0);

-- The 0 kcal rule (fillZeroKcalMacros in lib/macros.ts), for rows saved
-- before this: a food with 0 kcal and protein, carbs and fat all 0 (your
-- water) has no sugar, fiber or saturated fat either. Sodium is left
-- alone: salt has no calories, so 0 kcal says nothing about sodium.
--
-- Past log entries are fixed by their OWN numbers, never by looking at the
-- food, so "editing a food never changes past days" still holds. Every
-- other past entry stays null, because those foods really didn't have
-- these numbers when you logged them.

update public.foods
set sugar_g = 0, fiber_g = 0, saturated_fat_g = 0
where kcal = 0 and protein_g = 0 and carbs_g = 0 and fat_g = 0;

update public.meal_entries
set sugar_g = 0, fiber_g = 0, saturated_fat_g = 0
where kcal = 0 and protein_g = 0 and carbs_g = 0 and fat_g = 0;

commit;

-- To check afterwards (your water should show 0, 0, 0 and a blank sodium):
--   select name, kcal, sugar_g, fiber_g, saturated_fat_g, sodium_mg
--   from public.foods where kcal = 0;
