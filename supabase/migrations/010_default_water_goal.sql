-- A 2,000 ml water goal for everyone, and a switch to turn the water ring
-- off. Run this once in the Supabase dashboard: SQL Editor -> New query ->
-- Run. Run it BEFORE deploying the code that uses show_water: that code
-- asks the database for it, and until this runs it doesn't exist, so
-- Today and Settings would fail to load. Then deploy STRAIGHT AFTER: the
-- old code can save a blank water goal, which this makes impossible, so
-- saving Settings on the old code would fail until the new code is live.
-- Safe to run twice: the second run changes nothing.
--
-- daily_water_ml: every blank goal becomes 2,000 ml, new rows start at
--   2,000, and it can't be blank any more ("not null"). Turning water off
--   is now the show_water switch, not a blank goal, so your goal is kept
--   while the ring is off (turn it back on and 2,400 is still 2,400).
--   The order matters: blanks are filled BEFORE "not null" is added, or
--   adding it would fail on those rows.
--
-- show_water: "Show water on Today". On for everyone to start.
--
-- People who never saved Settings have no row at all. The app treats
-- "no row" as 2,000 ml with water on, so they get the ring from day one.
--
-- Row Level Security is unchanged: policies cover whole rows.
--
-- begin ... commit = all or nothing. If any line fails, nothing changes.

begin;

update public.user_settings
set daily_water_ml = 2000
where daily_water_ml is null;

alter table public.user_settings
  alter column daily_water_ml set default 2000,
  alter column daily_water_ml set not null,
  add column if not exists show_water boolean not null default true;

commit;

-- To check afterwards (every row should show a goal and true):
--   select daily_water_ml, show_water from public.user_settings;
