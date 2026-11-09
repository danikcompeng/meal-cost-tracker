-- Rename the ingredients table to foods. No data changes.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> Run.
--
-- Why rows and security survive: Postgres tracks a table by an internal ID,
-- not by its name. Rows, Row Level Security, policies and grants are attached
-- to that ID, so they carry over. The renames below only tidy up names.
--
-- begin ... commit = all or nothing. If any line fails, nothing changes.

begin;

alter table public.ingredients rename to foods;

-- Index and constraints. These are Postgres's default names; confirm them
-- with the constraint-listing query before running.
alter index public.ingredients_user_id_idx rename to foods_user_id_idx;
alter table public.foods rename constraint ingredients_pkey             to foods_pkey;
alter table public.foods rename constraint ingredients_user_id_fkey     to foods_user_id_fkey;
alter table public.foods rename constraint ingredients_name_check       to foods_name_check;
alter table public.foods rename constraint ingredients_price_check      to foods_price_check;
alter table public.foods rename constraint ingredients_package_size_check to foods_package_size_check;
alter table public.foods rename constraint ingredients_unit_check       to foods_unit_check;

-- Policies (the rules themselves are unchanged, only their names).
alter policy "Users read their own ingredients"   on public.foods rename to "Users read their own foods";
alter policy "Users add their own ingredients"    on public.foods rename to "Users add their own foods";
alter policy "Users update their own ingredients" on public.foods rename to "Users update their own foods";
alter policy "Users delete their own ingredients" on public.foods rename to "Users delete their own foods";

commit;
