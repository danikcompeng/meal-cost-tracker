-- Made-up meals for the motion pass recordings (plans/motion.md, decision D).
-- The same foods, recipes and day as the craft preview
-- (design/ui/craft/preview-page.tsx.txt), so the clips match those shots.
--
-- How to run it:
-- 1. Log in to the demo account once in the app, so it exists.
-- 2. Supabase dashboard → Authentication → Users → the demo account →
--    copy its "User UID".
-- 3. SQL Editor → New query → paste this whole file → replace
--    PASTE-THE-DEMO-USER-ID-HERE below with that id → Run.
--
-- Safe by design:
-- - It only writes rows whose user_id is the id you paste.
-- - It stops if that id isn't a real user, or if the account already has
--   foods (so it can't pile a second copy on top, or touch a real
--   account by mistake). To run it again after a recording, set
--   start_over to true: it first deletes that one account's entries,
--   recipes and foods, then seeds them fresh.
-- - No keys: the SQL Editor is already logged in as the project owner.
--
-- Dates: "today" is worked out in demo_tz, the same timezone your
-- browser gives the app, so the meals land on the day the app shows.
-- Snapshots (kcal, cost, …) are worked out the way the app does when you
-- log: amount × nutrient / basis, amount × price / package size, and a
-- recipe's per-serving totals × servings. Any unknown → unknown.

do $$
declare
  demo_user_text text    := 'PASTE-THE-DEMO-USER-ID-HERE';
  start_over     boolean := false;
  demo_tz        text    := 'America/Toronto';

  demo_user uuid;
  today     date;
  f_chicken uuid; f_rice uuid; f_broccoli uuid; f_beans uuid; f_eggs uuid;
  f_oats uuid; f_yogurt uuid; f_banana uuid; f_tuna uuid; f_water uuid;
  r_bowl uuid; r_fried uuid; r_beans uuid; r_tuna uuid; r_oats uuid;
begin
  if demo_user_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Paste the demo account''s User UID into demo_user_text first.';
  end if;
  demo_user := demo_user_text::uuid;

  if not exists (select 1 from auth.users where id = demo_user) then
    raise exception 'No user with id %. Log in to the demo account once, then copy its User UID.', demo_user;
  end if;

  if start_over then
    delete from public.meal_entries where user_id = demo_user;
    delete from public.recipes where user_id = demo_user;  -- its ingredients go with it
    delete from public.foods where user_id = demo_user;
  elsif exists (select 1 from public.foods where user_id = demo_user) then
    raise exception 'This account already has foods. Set start_over to true to replace them.';
  end if;

  today := (now() at time zone demo_tz)::date;

  -- Foods: name, unit, price paid, package size, then per 100 g / ml (or
  -- per 1 for "each"): kcal, protein, carbs, fat. Sugar, fiber, saturated
  -- fat and sodium are left unknown, as in the craft preview.
  insert into public.foods (user_id, name, unit, price, package_size, kcal, protein_g, carbs_g, fat_g)
    values (demo_user, 'Chicken thighs', 'g', 8.99, 1000, 177, 24, 0, 9) returning id into f_chicken;
  insert into public.foods (user_id, name, unit, price, package_size, kcal, protein_g, carbs_g, fat_g)
    values (demo_user, 'Jasmine rice', 'g', 2.49, 1000, 360, 7, 79, 0.6) returning id into f_rice;
  insert into public.foods (user_id, name, unit, price, package_size, kcal, protein_g, carbs_g, fat_g)
    values (demo_user, 'Frozen broccoli', 'g', 1.99, 340, 34, 2.8, 7, 0.4) returning id into f_broccoli;
  insert into public.foods (user_id, name, unit, price, package_size, kcal, protein_g, carbs_g, fat_g)
    values (demo_user, 'Black beans', 'g', 1.19, 425, 91, 6, 16, 0.4) returning id into f_beans;
  insert into public.foods (user_id, name, unit, price, package_size, kcal, protein_g, carbs_g, fat_g)
    values (demo_user, 'Eggs', 'each', 3.99, 12, 72, 6.3, 0.4, 4.8) returning id into f_eggs;
  insert into public.foods (user_id, name, unit, price, package_size, kcal, protein_g, carbs_g, fat_g)
    values (demo_user, 'Rolled oats', 'g', 3.49, 1000, 389, 16.9, 66, 6.9) returning id into f_oats;
  insert into public.foods (user_id, name, unit, price, package_size, kcal, protein_g, carbs_g, fat_g)
    values (demo_user, 'Greek yogurt', 'g', 4.99, 907, 59, 10, 3.6, 0.4) returning id into f_yogurt;
  insert into public.foods (user_id, name, unit, price, package_size, kcal, protein_g, carbs_g, fat_g)
    values (demo_user, 'Banana', 'each', 0.25, 1, 105, 1.3, 27, 0.4) returning id into f_banana;
  insert into public.foods (user_id, name, unit, price, package_size, kcal, protein_g, carbs_g, fat_g)
    values (demo_user, 'Canned tuna', 'g', 1.29, 142, 116, 26, 0, 1) returning id into f_tuna;
  -- Water: 0 kcal, so the 0 kcal rule fills the other nutrients with 0
  -- (sodium stays unknown), and it counts toward hydration.
  insert into public.foods (user_id, name, unit, price, package_size, kcal, protein_g, carbs_g, fat_g,
                            sugar_g, fiber_g, saturated_fat_g, counts_toward_hydration)
    values (demo_user, 'Water', 'ml', 0, 1000, 0, 0, 0, 0, 0, 0, 0, true) returning id into f_water;

  -- Recipes, and how much of each food goes into the whole recipe.
  insert into public.recipes (user_id, name, servings) values (demo_user, 'Chicken rice bowl', 4) returning id into r_bowl;
  insert into public.recipes (user_id, name, servings) values (demo_user, 'Egg fried rice', 2) returning id into r_fried;
  insert into public.recipes (user_id, name, servings) values (demo_user, 'Beans and rice', 3) returning id into r_beans;
  insert into public.recipes (user_id, name, servings) values (demo_user, 'Tuna rice', 2) returning id into r_tuna;
  insert into public.recipes (user_id, name, servings) values (demo_user, 'Overnight oats', 1) returning id into r_oats;

  -- created_at a second apart keeps the order they're listed in.
  insert into public.recipe_ingredients (recipe_id, food_id, amount, created_at)
  select i.recipe_id, i.food_id, i.amount, now() + make_interval(secs => i.n)
  from (values
    (r_bowl,  f_chicken, 800, 1), (r_bowl,  f_rice, 300, 2), (r_bowl,  f_broccoli, 340, 3),
    (r_fried, f_eggs,      4, 4), (r_fried, f_rice, 160, 5), (r_fried, f_broccoli, 170, 6),
    (r_beans, f_beans,   850, 7), (r_beans, f_rice, 240, 8),
    (r_tuna,  f_tuna,    284, 9), (r_tuna,  f_rice, 180, 10), (r_tuna, f_broccoli, 170, 11),
    (r_oats,  f_oats,     80, 12), (r_oats, f_yogurt, 170, 13), (r_oats, f_banana, 1, 14)
  ) as i(recipe_id, food_id, amount, n);

  -- Foods eaten on their own: today's snacks, plus a little history so
  -- the swap stack has "foods you've had this week".
  insert into public.meal_entries (user_id, day, meal, food_id, name, unit, amount, status,
                                   kcal, protein_g, carbs_g, fat_g, sugar_g, fiber_g,
                                   saturated_fat_g, sodium_mg, cost, water_ml, created_at)
  select demo_user, e.day, e.meal, f.id, f.name, f.unit, e.amount, 'eaten',
         e.amount * f.kcal / f.basis_amount,
         e.amount * f.protein_g / f.basis_amount,
         e.amount * f.carbs_g / f.basis_amount,
         e.amount * f.fat_g / f.basis_amount,
         e.amount * f.sugar_g / f.basis_amount,
         e.amount * f.fiber_g / f.basis_amount,
         e.amount * f.saturated_fat_g / f.basis_amount,
         e.amount * f.sodium_mg / f.basis_amount,
         e.amount * f.price / f.package_size,
         case when f.counts_toward_hydration then e.amount else 0 end,
         now() + make_interval(secs => e.n)
  from (values
    (today,     'snack',     f_banana,     1::numeric, 3),
    (today,     'snack',     f_water,    750,          4),
    (today - 1, 'dinner',    f_broccoli, 170,          0),
    (today - 2, 'breakfast', f_eggs,       2,          0)
  ) as e(day, meal, food_id, amount, n)
  join public.foods f on f.id = e.food_id;

  -- Recipes eaten: per-serving totals × servings. A recipe total is
  -- unknown if any ingredient is missing that nutrient or a price
  -- (CLAUDE.md, "Missing stays missing").
  with per_serving as (
    select r.id, r.name,
      case when bool_or(f.kcal is null) then null else sum(ri.amount * f.kcal / f.basis_amount) / r.servings end as kcal,
      case when bool_or(f.protein_g is null) then null else sum(ri.amount * f.protein_g / f.basis_amount) / r.servings end as protein_g,
      case when bool_or(f.carbs_g is null) then null else sum(ri.amount * f.carbs_g / f.basis_amount) / r.servings end as carbs_g,
      case when bool_or(f.fat_g is null) then null else sum(ri.amount * f.fat_g / f.basis_amount) / r.servings end as fat_g,
      case when bool_or(f.sugar_g is null) then null else sum(ri.amount * f.sugar_g / f.basis_amount) / r.servings end as sugar_g,
      case when bool_or(f.fiber_g is null) then null else sum(ri.amount * f.fiber_g / f.basis_amount) / r.servings end as fiber_g,
      case when bool_or(f.saturated_fat_g is null) then null else sum(ri.amount * f.saturated_fat_g / f.basis_amount) / r.servings end as saturated_fat_g,
      case when bool_or(f.sodium_mg is null) then null else sum(ri.amount * f.sodium_mg / f.basis_amount) / r.servings end as sodium_mg,
      sum(ri.amount * f.price / f.package_size) / r.servings as cost,
      sum(case when f.counts_toward_hydration then ri.amount else 0 end) / r.servings as water_ml
    from public.recipes r
    join public.recipe_ingredients ri on ri.recipe_id = r.id
    join public.foods f on f.id = ri.food_id
    where r.user_id = demo_user
    group by r.id, r.name, r.servings
  )
  insert into public.meal_entries (user_id, day, meal, recipe_id, name, unit, amount, status,
                                   kcal, protein_g, carbs_g, fat_g, sugar_g, fiber_g,
                                   saturated_fat_g, sodium_mg, cost, water_ml, created_at)
  select demo_user, e.day, e.meal, p.id, p.name, 'serving', e.servings, 'eaten',
         p.kcal * e.servings, p.protein_g * e.servings, p.carbs_g * e.servings, p.fat_g * e.servings,
         p.sugar_g * e.servings, p.fiber_g * e.servings, p.saturated_fat_g * e.servings,
         p.sodium_mg * e.servings, p.cost * e.servings, p.water_ml * e.servings,
         now() + make_interval(secs => e.n)
  from (values
    (today,     'breakfast', r_oats,  1::numeric, 1),
    (today,     'lunch',     r_bowl,  1,          2),
    (today - 1, 'lunch',     r_bowl,  1,          0),
    (today - 2, 'dinner',    r_fried, 1,          0),
    (today - 5, 'dinner',    r_tuna,  1,          0)
  ) as e(day, meal, recipe_id, servings, n)
  join per_serving p on p.id = e.recipe_id;

  -- Daily targets, as in the craft preview.
  insert into public.user_settings (user_id, daily_kcal, daily_protein_g, daily_carbs_g, daily_fat_g,
                                    daily_water_ml, show_water)
  values (demo_user, 2200, 150, 230, 70, 2000, true)
  on conflict (user_id) do update set
    daily_kcal = excluded.daily_kcal, daily_protein_g = excluded.daily_protein_g,
    daily_carbs_g = excluded.daily_carbs_g, daily_fat_g = excluded.daily_fat_g,
    daily_water_ml = excluded.daily_water_ml, show_water = excluded.show_water;

  raise notice 'Seeded the demo account for %.', today;
end $$;
