# Meal Cost Tracker

## What this app is
A budgeting-first recipe app for someone living alone. It answers:
"What can I cook cheaply, on repeat, without getting bored?"

Core features:
1. Ingredients with prices (name, price, package size, unit)
2. Recipes with auto-calculated cost per serving
3. Weekly meal plan with total cost and combined grocery list
4. "I'm tired of this" swaps: suggest recipes that share the most
   ingredients with the one being replaced
5. Weekly budget bar

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui for components
- Framer Motion for animation
- Supabase (Postgres + auth) for the backend
- Playwright for end-to-end tests
- Deployed on Vercel

## Database tables
- ingredients (id, name, price, package_size, unit)
- recipes (id, name, servings, steps)
- recipe_ingredients (recipe_id, ingredient_id, amount)
- meal_plans (id, week_start)
- meal_plan_items (plan_id, recipe_id)
- settings (weekly_budget)

Cost per serving = sum of (amount x price per unit) / servings.

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
- Display: a characterful serif for page titles and the biggest numbers.
- Body/UI: a clean sans-serif. Prices use tabular numbers so they line up.
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
- Display: Fraunces, semibold, "soft" axis turned up. Page titles and the
  ONE big number per screen only. It has no tabular figures, so never use
  it for columns or lists of prices.
- Body/UI: Figtree. All other text, including every price in a list, with
  `tabular-nums`. (DM Sans from Google Fonts has no tabular figures.)
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