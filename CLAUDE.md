# Meal Cost Tracker

## What this app is
"Cheap meals that hit your macros, on repeat, with a swap when you're bored."

Not a generic calorie tracker. It's for someone living alone who repeats
their own cheap staple meals. When they're bored, one tap swaps to a meal
with the same protein, using ingredients they already bought, priced at
what they actually paid. Every feature must serve that.
(Competitor research and the gap we fill: notes.md, 2026-11-09.)

Main screen: today's meals against daily targets (calories, protein,
carbs, fat), plus what today costs.

Core features:
1. Staple recipes: your own small set of meals you eat on repeat. Each
   shows calories, macros, cost and protein per dollar per serving.
   Inside a recipe the UI still calls its foods "ingredients".
2. Day and week: plan meals onto days, mark them eaten with one tap.
   Day totals go against targets. Week cost goes against the weekly
   budget bar.
3. "I'm tired of this" swap (the signature feature): one tap replaces a
   planned or eaten meal with another of YOUR recipes that
   - keeps protein per serving close (within about 15%),
   - uses the most ingredients already in your kitchen,
   - costs least at the prices you actually paid,
   - and you haven't eaten recently.
   All three of protein, kitchen and price count. Scoring is a pure
   function in /lib so it can be unit tested.
4. What's in my kitchen: each purchase records what you actually paid and
   how much you got. It counts as "in the kitchen" until you mark it used
   up with a manual tap (never subtracted automatically, so the list
   can't drift from reality). Costs use your latest price paid. Prices
   are never estimated: a food you haven't bought shows "no price yet",
   never a guess and never $0.
5. Adding foods fast:
   - Barcode: scan with the phone camera, look it up in Open Food Facts,
     then enter what you paid. Made for unpacking groceries.
   - Fallback: photo of the nutrition label, read by Claude. You check
     and correct the numbers before saving.
   - Manual entry always works.
6. Protein per dollar (our unique number): grams of protein per $1,
   shown on recipes, swap suggestions and the day.

Platform: web app only, installable on iPhone and Android as a PWA.
Out of scope: Apple Health / Google Fit, calories burnt, exercise,
generated or suggested recipes from outside your own, and searching a
big public food database as the main way to log.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui for components
- Framer Motion for animation
- Supabase (Postgres + auth) for the backend
- Playwright for end-to-end tests
- Deployed on Vercel

## Database tables
Row Level Security on every table. Each row belongs to one user
(user_id = auth.uid()); policies only allow reading, adding, changing
and deleting your own rows. Tables without user_id check ownership
through their parent row.

- foods (renamed from `ingredients`; existing rows kept)
  id, user_id, name, brand, barcode,
  source ('manual' | 'open_food_facts' | 'label_photo'),
  unit ('g' | 'ml' | 'each'),
  basis_amount (nutrition is per this much: 100 for g/ml, 1 for each),
  kcal, protein_g, carbs_g, fat_g,
  sugar_g, fiber_g, saturated_fat_g, sodium_mg  ("More nutrients",
  shown small and quiet; sodium in mg, the rest in g),
  serving_size (optional), created_at
  unique (user_id, barcode)
  All nutrients are optional: blank = unknown (null), never 0.
  0 kcal rule: with kcal 0, blank protein, carbs, fat, sugar, fiber and
  saturated fat are saved as 0. Sodium is never filled (salt has no
  calories). Open Food Facts stores sodium in grams; if they only have
  salt, sodium mg = salt g x 400 (salt = sodium x 2.5).

- purchases (what you actually bought and paid)
  id, user_id, food_id, purchased_on, price_paid, package_size,
  used_up_at (empty = still in the kitchen), created_at
  Existing ingredient prices become one purchase each.

- recipes
  id, user_id, name, servings, steps, created_at

- recipe_ingredients
  recipe_id, food_id, amount
  RLS: you must own the recipe AND the food.

- meal_entries (the plan and the log in one table)
  id, user_id, day (date, in the user's timezone),
  meal ('breakfast'|'lunch'|'dinner'|'snack'),
  food_id (on delete set null), recipe_id (added with recipes),
  at most one of recipe_id / food_id (the app requires exactly one when
  logging; both are empty once the food or recipe is deleted),
  name, unit  (copied when logged, so past days keep their labels),
  amount (servings or food unit, > 0),
  status ('planned' | 'eaten'),
  kcal, protein_g, carbs_g, fat_g,
  sugar_g, fiber_g, saturated_fat_g, sodium_mg, cost  (snapshot for this
  amount, copied when logged/marked eaten; null = unknown, never 0),
  created_at
  RLS: own rows, and food_id must be one of your foods.

- user_settings (one row per user)
  user_id, daily_kcal, daily_protein_g, daily_carbs_g, daily_fat_g,
  weekly_budget, week_starts_on, timezone

Formulas (pure functions in /lib):
- Price per unit  = latest price_paid / package_size for that food
- Cost of amount  = amount x price per unit
- Nutrient amount = amount x (nutrient / basis_amount), for all eight
  nutrients (the list is NUTRIENT_KEYS in lib/macros.ts)
- Per serving     = sum over recipe ingredients / servings, all eight
  nutrients, with unknowns counted the same "+ N unknown" way
- Protein per $   = protein_g / cost   (hidden if cost is 0 or unknown)

## Working rules
- Build ONE feature at a time. Do not start the next feature until
  I confirm the current one works.
- Before writing code for any feature, propose a short plan and wait
  for my approval.
- Keep components small and in /components. Keep data logic in /lib.
- Put cost calculation in a pure function in /lib/cost.ts so it can
  be unit tested.
- Explain anything non-obvious in plain language. I am learning.
- When something breaks, explain WHY before fixing it.
- Never commit secrets. Use .env.local for Supabase keys.

## Design
Direction: clean and calm, black ink on white paper with one matcha-green
accent, like a tidy recipe card, not a finance dashboard. References in
design/references/ still guide layout and type, but their cream colors
are replaced by the palette below.

Color
- Background: white. Tiles on a light grey that still stands out from
  it. Dark mode: near-black, never pure black.
- Primary: matcha green is the single accent, for actions and key numbers.
- Highlight: warm butter yellow, used sparingly (active tab, over-budget
  warnings use a muted red instead).
- Greys are neutral (no warm or cool tint), for labels and borders.

Type
- One clean sans-serif for everything: bold for page titles and the
  biggest numbers, regular for the rest. Numbers are tabular so they line up.
- Hierarchy: the most important number on each screen (cost per serving,
  weekly total) is the largest thing on it, with a small grey label above.

Layout
- Mobile-first, generous spacing. Content in soft rounded tiles with no
  heavy shadows. Use chips for tags and a segmented control for
  Day / Week views.

Motion (Framer Motion)
- Signature moment: the "I'm tired of this" swap. Ingredient tiles rotate
  like a carousel and the new meal slides in. This should feel delightful.
- Everything else is subtle: the budget bar fills smoothly, lists fade in.
- Respect prefers-reduced-motion.

Rules
- Design every state: empty, loading, error, first use, phone width.
- No purple gradients, no emoji icons, no generic card-everything look.
- Before building a screen, describe the layout in words and wait for my
  approval.

Fonts (final)
- Figtree, one font for the whole app (chose it over Fraunces, Geist and
  Manrope on 2026-11-11: the serif felt old-fashioned for a fitness app).
- Bold: page titles and the ONE big number per screen. Regular/medium:
  everything else.
- Every number uses `tabular-nums`, including the big number and every
  price in a list. (DM Sans from Google Fonts has no tabular figures.)
- Sizes: label 13px medium grey · key number 48px · page title 30px ·
  body 16px (16px also stops iPhones zooming into inputs).

Colors (final): light / dark
- background      #FFFFFF / #141414   white / near-black
- tile (card)     #F0F0F0 / #1F1F1F   light grey, one step off background
- popover         #FFFFFF / #1F1F1F   menus (bordered, so they show on white)
- hover (accent)  #E8E8E8 / #2A2A2A   hover backgrounds on tiles
- foreground      #171717 / #EDEDED   near-black ink / off-white text
- muted-fg (grey) #616161 / #A3A3A3   neutral grey for labels
- border          #E2E2E2 / #2E2E2E   barely visible
- primary         #4F6B2E / #93C07F   matcha: actions, key numbers, text
- primary-fg      #FFFFFF / #141414   text on matcha buttons
- matcha-soft     #78855A / #76855A   NON-TEXT fills only: budget bar, chart bars
- highlight       #F2C94C / #E9C25A   butter: active tab/pill only, dark text on it
- destructive     #A8432F / #E08470   over budget: muted tomato red
All text colors pass 4.5:1 contrast on background, tiles, popovers and
hover backgrounds (lowest: destructive on light hover, 4.88:1).
matcha-soft is never used for text or as the only way to show information
(the budget bar always has its amount written next to it).

## Commit style
Small commits with clear messages, one per working feature.