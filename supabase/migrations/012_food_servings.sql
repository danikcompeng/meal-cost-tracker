-- Item servings: "1 bagel = 80 g" on a food, as a shortcut for typing
-- grams. Optional. The food is still measured in g or ml, every amount
-- saved (log entries, recipe ingredients) is still in g or ml, and costs
-- and nutrients don't change.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> Run.
-- Run it BEFORE deploying the code that uses it: that code asks the
-- database for these columns, and until this runs they don't exist, so
-- Today, Kitchen and the demo reset would fail. The old code keeps
-- working after it runs (it never asks for them).
--
-- foods.serving_name: what one serving is called ("bagel", "can").
-- foods.serving_amount: how much one serving is, in the food's own unit
--   (80 means 80 g for a g food, 80 ml for an ml food).
-- Rules:
--   - Both set, or both empty. Half a serving makes no sense.
--   - The amount is above 0 and at most 10,000 (the app's limit too).
--   - The name is 1 to 40 characters.
--   - Only g and ml foods: an "each" food is already counted in items.
-- Existing foods get no serving (both empty). Nothing is guessed.
--
-- Row Level Security is unchanged: policies cover whole rows, so the new
-- columns are protected automatically.
--
-- begin ... commit = all or nothing. If any line fails, nothing changes.

begin;

alter table public.foods
  add column serving_name   text,
  add column serving_amount numeric(10, 2);

alter table public.foods
  add constraint foods_serving_both_or_neither
    check ((serving_name is null) = (serving_amount is null)),
  add constraint foods_serving_amount_check
    check (serving_amount is null or (serving_amount > 0 and serving_amount <= 10000)),
  add constraint foods_serving_name_check
    check (serving_name is null or char_length(serving_name) between 1 and 40),
  add constraint foods_serving_unit_check
    check (serving_amount is null or unit in ('g', 'ml'));

commit;
