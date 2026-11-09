-- One-time correction: 0 kcal means 0 protein, carbs and fat.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> Run.
--
-- Why: calories come from protein, carbs and fat, so a food with 0 kcal has
-- none of them. Water saved as "0 kcal, macros blank" counted as unknown and
-- put "+ 1 unknown" under every total. The app now saves those blanks as 0
-- (fillZeroKcalMacros in lib/macros.ts); this applies the same rule to rows
-- saved before that.
--
-- The rule, same as the app: kcal is exactly 0, at least one of protein /
-- carbs / fat is blank, and every one that IS filled in is 0. A row with
-- 0 kcal but, say, 5 g protein contradicts itself, so it's left alone.
--
-- Past log entries are fixed by their OWN numbers (an entry with 0 kcal and
-- blank macros), never by looking at the food, so "editing a food never
-- changes past days" still holds.
--
-- This runs as the database owner in the SQL editor, so it covers every
-- user's rows, not just yours (RLS applies to the app, not to you here).
-- coalesce(x, 0) means "x, or 0 if x is blank".
--
-- begin ... commit = all or nothing. If any line fails, nothing changes.

begin;

update public.foods
set protein_g = coalesce(protein_g, 0),
    carbs_g   = coalesce(carbs_g, 0),
    fat_g     = coalesce(fat_g, 0)
where kcal = 0
  and (protein_g is null or carbs_g is null or fat_g is null)
  and coalesce(protein_g, 0) = 0
  and coalesce(carbs_g, 0) = 0
  and coalesce(fat_g, 0) = 0;

update public.meal_entries
set protein_g = coalesce(protein_g, 0),
    carbs_g   = coalesce(carbs_g, 0),
    fat_g     = coalesce(fat_g, 0)
where kcal = 0
  and (protein_g is null or carbs_g is null or fat_g is null)
  and coalesce(protein_g, 0) = 0
  and coalesce(carbs_g, 0) = 0
  and coalesce(fat_g, 0) = 0;

commit;

-- To see what changed afterwards (should list your water, with 0s).
-- A row that still shows a blank has a macro above 0 with 0 kcal, which
-- contradicts itself, so it was left alone on purpose: fix it by hand.
--   select name, kcal, protein_g, carbs_g, fat_g from public.foods where kcal = 0;
--   select day, name, kcal, protein_g, carbs_g, fat_g from public.meal_entries where kcal = 0;
