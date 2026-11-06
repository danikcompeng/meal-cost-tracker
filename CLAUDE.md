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
- Clean, minimal, lots of whitespace, one accent color
- Subtle motion only: smooth transitions, animated budget bar
- Mobile-first, since I will use this in the kitchen and at the store

## Commit style
Small commits with clear messages, one per working feature.