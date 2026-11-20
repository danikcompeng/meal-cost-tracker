# Meal Cost Tracker

## What this app is
"Cheap meals that hit your macros, on repeat, with a swap when you're bored."

Not a generic calorie tracker. It's for someone living alone who repeats
their own cheap staple meals. When they're bored, one tap swaps to a meal
with the same protein, using ingredients they already bought, priced at
what they actually paid. Every feature must serve that.
(Competitor research and the gap we fill: notes.md, 2026-11-09.)

Main screen: today's meals against daily targets (calories, protein,
carbs, fat, water), plus what today costs. Folded, the summary is
progress rings with one number each; "Show details" unfolds the exact
amounts (plans/rings-and-hydration.md).

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
   - needs the fewest foods you'd have to get (for now: foods you haven't
     logged in the last 7 days),
   - costs least at the prices you actually paid,
   - and you haven't eaten recently.
   All three of protein, kitchen and price count. Scoring is a pure
   function in /lib so it can be unit tested (lib/swap.ts, plan in
   plans/swap.md). Sorted like a spreadsheet by several columns, each a
   coarse group so the later ones still get a say:
   1. protein: close (within 15% or 2 g, whichever is bigger) → known
      but not close → unknown
   2. foods you'd need to get (the ones you don't have): none → 1 → 2
      or more
   3. cost: cheaper or at most 10% / $0.25 more → pricier → unknown
   4. not eaten in the last 3 days → eaten recently
   5. ties: closer protein, cheaper, longer since eaten, name, id
   Unknowns sort last in their column (even when the current meal's
   value is unknown too) and never earn a reason chip. A card's notes say
   what's unknown and who's missing it, never where it sits in the stack.
   Until purchases exist, "foods you have" = foods logged in the last 7
   days, alone or inside a recipe, and the card says exactly that ("Uses
   3 foods you've had this week"), never "in your kitchen". Purchases
   will replace that input without changing the ranking.
   Servings stay the same when you swap.
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
The home-screen name, colours and icon list live in lib/app-identity.ts;
the icon drawing is components/app-icon.tsx (plan: plans/pwa.md).
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
  counts_toward_hydration (only true for ml foods; on by default for a
  new food whose name contains the word "water"),
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
  id, user_id, name, servings (> 0, up to 100, 2 decimals),
  steps (optional, no UI yet), created_at

- recipe_ingredients
  recipe_id (on delete cascade), food_id, amount (in the food's unit,
  for the whole recipe), created_at (keeps the order you added them)
  primary key (recipe_id, food_id): each food once per recipe.
  A food that's in a recipe can't be deleted (the app says which recipe;
  the database refuses as a backstop) and can't change unit.
  RLS: you must own the recipe AND the food.

- meal_entries (the plan and the log in one table)
  id, user_id, day (date, in the user's timezone),
  meal ('breakfast'|'lunch'|'dinner'|'snack'),
  food_id (on delete set null), recipe_id (on delete set null),
  at most one of recipe_id / food_id (the app requires exactly one when
  logging; both are empty once the food or recipe is deleted),
  name, unit  (copied when logged, so past days keep their labels;
  unit is 'serving' for a recipe, the food's unit otherwise),
  amount (servings or food unit, > 0),
  status ('planned' | 'eaten'),
  kcal, protein_g, carbs_g, fat_g,
  sugar_g, fiber_g, saturated_fat_g, sodium_mg, cost  (snapshot for this
  amount, copied when logged/marked eaten; null = unknown, never 0),
  water_ml  (snapshot: the amount when the food counts toward
  hydration, else 0; never null, so water never shows "+ unknown"),
  created_at
  RLS: own rows, food_id must be one of your foods and recipe_id one of
  your recipes.

- user_settings (one row per user)
  user_id, daily_kcal, daily_protein_g, daily_carbs_g, daily_fat_g,
  daily_water_ml (2,000 by default, never blank), show_water ("Show
  water on Today", on by default; off hides water there and keeps the
  goal). No row yet = these defaults and no calorie or macro targets.
  weekly_budget, week_starts_on, timezone

Formulas (pure functions in /lib):
- Price per unit  = latest price_paid / package_size for that food
- Cost of amount  = amount x price per unit
- Nutrient amount = amount x (nutrient / basis_amount), for all eight
  nutrients (the list is NUTRIENT_KEYS in lib/macros.ts)
- Per serving     = sum over recipe ingredients / servings, for cost,
  all eight nutrients and water (an ingredient adds water only if its
  food counts toward hydration)
- Protein per $   = protein_g / cost   (hidden if cost is 0 or unknown)

Missing stays missing (one rule, everywhere): never show a lower number
that quietly leaves an unknown out.
- A recipe is one meal, so if ANY ingredient is missing a price or a
  nutrient, that recipe total is "—", and the screen names who's
  missing it ("Water has no sodium"). Logged, it's saved as unknown.
- A day adds up separate entries: it sums the known ones and always
  says what's left out ("+ 1 food without protein"; cost says "at
  least"), so the shown number is never mistaken for the whole day.
- Logging a recipe snapshots per serving x servings eaten, so editing a
  recipe or food later never changes a past day.

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
- Nested corners are concentric: when a rounded shape sits closer to its
  container's edge than the container's corner radius, its radius is
  the container's minus the gap, border included (10 px track, 1 px
  border, 4 px padding → 5 px). Write it from the outer token, e.g.
  rounded-[calc(var(--radius-lg)-5px)], so it follows if --radius
  changes. With a bigger gap the inner radius is free. Pills in pills
  and circles in rings already follow it.

Motion (Framer Motion)
- Signature moment: the "I'm tired of this" swap. Your other recipes come
  up as a card stack, best match first, each card showing its
  ingredients as chips. Swipe right (or tap Swap) to swap, left (Skip)
  for the next card. Everything stays flat and level, moving only
  sideways: no tilt or rotation, nothing up or down. Skip slides the
  card straight off to the left, shrinking and fading a little, and the
  next card comes up. Swap doesn't throw the card: the sheet closes and
  the swap is one move left on Today's row, like a carousel (the old
  meal slides out left, shrinking to 0.9 and fading; the new one grows
  in from the right). With Reduce Motion: a crossfade. This should feel
  delightful.
- Everything else is subtle: progress rings and the budget bar fill
  smoothly, lists fade in.
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
  body 16px (16px also stops iPhones zooming into inputs). Classes in
  Tokens below.

Colors (final): light / dark
Written in OKLCH in app/globals.css (same colours as these hex values;
lib/color.test.ts checks every one and its contrast). Every matcha
colour reads one hue, --accent-h (130), so an accent preset changes
only that number.
- background      #FFFFFF / #141414   white / near-black
- tile (card)     #F0F0F0 / #1F1F1F   light grey, one step off background
- popover         #FFFFFF / #2A2A2A   sheets, dialogs, menus, messages
                                      (bordered, so they show on white)
- raised          (none)  / #333333   dark only: tiles, chips, greyed
                                      buttons and hovers inside a popover
                                      (surface-raised)
- hover (accent)  #E8E8E8 / #2A2A2A   hover backgrounds on tiles
- foreground      #171717 / #EDEDED   near-black ink / off-white text
- muted-fg (grey) #616161 / #A3A3A3   neutral grey for labels
- border          #E2E2E2 / #2E2E2E   barely visible. See-through (black
                                      11.5% / white 11%), so it shows the
                                      same on tiles and sheets; these hex
                                      are on the page
- field-border    #858585 / #7A7A7A   edges of boxes you type in only
                                      (3:1, so a box can be found)
- primary         #4F6B2E / #93C07F   matcha: actions, key numbers, text
- primary-fg      #FFFFFF / #141414   text on matcha buttons
- matcha-soft     #78855A / #76855A   NON-TEXT fills only: budget bar, chart bars
- highlight       #F2C94C / #E9C25A   butter: active tab/pill only, dark text on it
- destructive     #A8432F / #E08470   over budget: muted tomato red
All text colors pass 4.5:1 contrast on background, tiles, popovers,
raised and hover backgrounds (lowest: destructive on dark raised,
4.63:1). Tinted buttons are measured separately (lowest: a red button
on a dark sheet, 4.51:1; red "Yes" on a food row being edited, 4.53:1;
white on matcha hover, 4.82:1).
Dark mode shows depth by lightness, never shadows: page, tile, popover,
raised, each one step lighter. Busy buttons stay full
colour; unavailable ones are greyed with muted text on muted (5.4:1,
5.0:1 inside a dark sheet), never faded with opacity.
No box you type in and no red button on a tile inside a sheet: on dark
raised they'd be 2.9:1 and 3.99:1. Put them straight on the sheet.
An accent preset is set on <html>, unlayered:
:root[data-accent="ocean"] { --accent-h: 240; }. Anywhere else it does
nothing, because --primary is worked out on <html>.
matcha-soft is never used for text or as the only way to show information
(the budget bar always has its amount written next to it).

Tokens: use these, never a raw hex, rgb() or a made-up size
| Kind    | Use                                                        |
|---------|------------------------------------------------------------|
| Colour  | the names above as classes (bg-card, text-muted-foreground, border-field-border, bg-camera/80...), backdrop:bg-scrim (black 40%) behind sheets and dialogs. Hex only in lib/app-identity.ts (status bar, icon), checked against globals.css by lib/color.test.ts |
| Type    | text-label 13 (labels, chips; our own, lib/utils.ts tells cn) · text-sm 14 (secondary lines, buttons) · text-base 16 (body, inputs) · text-lg 18 (sheet titles) · text-xl 20 · text-2xl 24 (swap card name) · text-3xl 30 (page titles, with leading-tight) · text-4xl 36 (big ring number at 6+ digits) · text-5xl 48 (the key number) |
| Spacing | Tailwind's 4 px steps (--spacing): 1 2 3 4 5 6 8, half steps for tight chips and rows. Page gutter px-4, tile padding p-4 or p-5, tap targets h-11 (44 px) or h-12 |
| Radius  | from --radius (10 px): rounded-md 8 (text links), rounded-lg 10 (buttons, boxes, rows), rounded-2xl 18 (tiles, sheets, cards), rounded-full (chips, pills, rings); plain rounded 4 only on skeleton text bars. Nested corners: concentric rule above |
| Motion  | lib/motion.ts: DURATION fast 150 / base 200 / slow 250 ms, EASE_OUT / EASE_IN, SPRING snap / settle / sheet, SCALE_FROM 0.97 and PRESS_SCALE_WIDE 0.985 (press, press-wide), PUSH_SCALE / PUSH_FADE (swap carousel), SLIDE 24 px, RUBBER, SHAKE_X, THROW_SPEED; named exceptions FILL_DURATION / FILL_EASE (rings) and SETTLE_DURATION (Undo message). CSS copies are --motion-* in globals.css; lib/motion.test.ts checks they match and that answers to a tap stay 150–250 ms |
Arbitrary values left on purpose: safe-area insets (env(), the phone
decides), max-h-[85dvh] on sheets, concentric corners written from their
outer token, and two width formulas (the dialog's 1 rem gutter, the scan
window's min(80vw, 360px)). Sizes that JavaScript also needs (ring sizes,
the swipe reveal width) stay numbers in the component, on the 4 px grid.

## Commit style
Small commits with clear messages, one per working feature.