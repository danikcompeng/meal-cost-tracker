-- Your daily targets: calories, protein, carbs and fat.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> Run.
--
-- One row per user, so user_id is the primary key: a second row for the
-- same person is impossible, and saving uses "insert, or update if the
-- row already exists" (an upsert).
--
-- Every target is optional. Empty (null) means "no target", never 0.
-- Calories can't be 0 (a 0 kcal target makes no sense), but a macro can
-- (0 g carbs is a real choice).
--
-- Weekly budget, week start and timezone are NOT here yet. They arrive
-- with the features that use them, each in its own migration.
--
-- begin ... commit = all or nothing. If any line fails, nothing changes.

begin;

create table public.user_settings (
  user_id          uuid primary key default auth.uid()
                   references auth.users (id) on delete cascade,
  -- Whole numbers only: a target of 2000.5 kcal adds nothing.
  daily_kcal       integer
                   constraint user_settings_daily_kcal_check
                   check (daily_kcal between 1 and 10000),
  daily_protein_g  integer
                   constraint user_settings_daily_protein_g_check
                   check (daily_protein_g between 0 and 1000),
  daily_carbs_g    integer
                   constraint user_settings_daily_carbs_g_check
                   check (daily_carbs_g between 0 and 1000),
  daily_fat_g      integer
                   constraint user_settings_daily_fat_g_check
                   check (daily_fat_g between 0 and 1000),
  -- The app sets this on every save.
  updated_at       timestamptz not null default now()
);

alter table public.user_settings enable row level security;

grant select, insert, update, delete on public.user_settings to authenticated;

-- An upsert needs all three of read, add and change: Postgres reads your
-- row to find out whether it already exists.
create policy "Users read their own settings"
  on public.user_settings for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users add their own settings"
  on public.user_settings for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own settings"
  on public.user_settings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own settings"
  on public.user_settings for delete to authenticated
  using ((select auth.uid()) = user_id);

commit;
