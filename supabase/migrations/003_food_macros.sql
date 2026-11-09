-- Add calories and macros to foods. All optional for now.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> Run.
--
-- Missing stays missing: the new columns have no default, so existing foods
-- get null ("not entered"), never 0. A CHECK rule lets null through (null
-- isn't true or false, and only false is refused), so blanks are allowed
-- while negative numbers are not.
--
-- The limits here are loose on purpose. They only catch typos like 35000
-- kcal: one "each" food can be a whole pizza. The app checks the stricter
-- per-100 g rules before saving.
--
-- Row Level Security is unchanged. Policies and grants apply to whole rows
-- of the table, so the new columns are covered automatically.
--
-- begin ... commit = all or nothing. If any line fails, nothing changes.

begin;

alter table public.foods
  add column kcal numeric(7, 1)
    constraint foods_kcal_check check (kcal between 0 and 10000),
  add column protein_g numeric(6, 1)
    constraint foods_protein_g_check check (protein_g between 0 and 1000),
  add column carbs_g numeric(6, 1)
    constraint foods_carbs_g_check check (carbs_g between 0 and 1000),
  add column fat_g numeric(6, 1)
    constraint foods_fat_g_check check (fat_g between 0 and 1000),
  -- Nutrition is "per this much": 100 for g/ml, 1 for each. Postgres works it
  -- out from unit, so the two can never disagree and nobody can type it in.
  add column basis_amount numeric
    generated always as (case when unit = 'each' then 1 else 100 end) stored;

commit;
