-- Barcodes, brands and where a food came from.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> Run.
--
-- barcode: the digits on the package, saved in one standard form by the
--   app (lib/barcode.ts), so the same product can't be saved twice as
--   "036000291452" and "0036000291452". Optional: most home-made or loose
--   foods have none.
-- brand: optional, e.g. "Quaker".
-- source: how the food was added. Existing foods were all typed in by
--   hand, so the default 'manual' is right for them.
--
-- "unique (user_id, barcode)": each of YOUR barcodes can appear once.
-- Two people can both have the same cereal. Foods without a barcode never
-- clash, because Postgres doesn't count two empty (null) values as equal.
-- The unique rule also builds an index, which makes "do I already have
-- this barcode?" fast when you scan.
--
-- Row Level Security is unchanged: policies cover whole rows, so the new
-- columns are protected automatically.
--
-- begin ... commit = all or nothing. If any line fails, nothing changes.

begin;

alter table public.foods
  add column barcode text
    constraint foods_barcode_check check (barcode ~ '^[0-9]{8,14}$'),
  add column brand text
    constraint foods_brand_check check (char_length(trim(brand)) between 1 and 100),
  add column source text not null default 'manual'
    constraint foods_source_check
    check (source in ('manual', 'open_food_facts', 'label_photo'));

alter table public.foods
  add constraint foods_user_id_barcode_key unique (user_id, barcode);

commit;

-- To check afterwards (every existing food should say 'manual'):
--   select name, barcode, brand, source from public.foods;
