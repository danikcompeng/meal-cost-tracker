-- Ingredients you buy, with what you paid and how much was in the package.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> Run.

create table public.ingredients (
  id            uuid primary key default gen_random_uuid(),
  -- auth.uid() = "whoever is logged in", filled in automatically on insert.
  user_id       uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  name          text not null check (char_length(trim(name)) between 1 and 100),
  price         numeric(10, 2) not null check (price >= 0),
  package_size  numeric(12, 3) not null check (package_size > 0),
  -- Always stored in a base unit; the app converts kg -> g and l -> ml.
  unit          text not null check (unit in ('g', 'ml', 'each')),
  created_at    timestamptz not null default now()
);

create index ingredients_user_id_idx on public.ingredients (user_id);

-- Row Level Security: Postgres itself refuses to show or change rows that
-- don't belong to the logged-in user. Logged-out visitors get nothing.
alter table public.ingredients enable row level security;

grant select, insert, update, delete on public.ingredients to authenticated;

create policy "Users read their own ingredients"
  on public.ingredients for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users add their own ingredients"
  on public.ingredients for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own ingredients"
  on public.ingredients for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own ingredients"
  on public.ingredients for delete to authenticated
  using ((select auth.uid()) = user_id);
