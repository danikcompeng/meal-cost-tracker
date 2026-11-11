# Meal Cost Tracker

**Cheap meals that hit your macros, on repeat, with a swap when you're bored.**

Live: [meal-cost-tracker.vercel.app](https://meal-cost-tracker.vercel.app)

I'm living alone and cooking for myself, so I need a few cheap meals I can repeat that
still hit my protein. Calorie trackers like MyFitnessPal don't know what food costs.
Meal planners like Eat This Much generate recipes with ingredients I don't have and never
reuse them, and MealMate is mostly paywalled with no prices at all. So I'm building the
app I wanted: my own staple meals, real prices, and a one-tap swap to a meal with the same
protein using groceries I already bought.

## Status

Work in progress (November 2026). Built so far:

- Magic link login (Supabase Auth), with Row Level Security so every row is private to its owner
- Foods with prices and calories / protein / carbs / fat, per 100 g, 100 ml or per item
- Cost math with unit tests: a missing price or macro shows "—", never a made-up 0
- Design system: tokens for color, type and spacing, light and dark mode
- Daily food log *(in progress)*

Coming next: daily targets, barcode scanning (Open Food Facts), recipes with macros and cost
per serving, the swipe-to-swap feature, and installing it on a phone as a PWA.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS + shadcn/ui · Framer Motion ·
Supabase (Postgres, Auth, RLS) · Vitest · Vercel

## How I build with AI

I build with **Claude Code**. It writes most of the code; I make the decisions, review its
work, and read the code until I understand it.

- **Plan first.** For every feature, Claude proposes a plan (database changes, files, tests,
  and the phone layout in words) and waits. I review it, push back and change it before any
  code is written. One feature at a time, one commit per working feature.
- **`CLAUDE.md` is the source of truth.** It holds the app's purpose, database schema,
  formulas, design system and working rules, so every session builds toward the same thing.
  I learned to treat this file, not the chat, as the spec after a color value drifted between
  what we agreed and what got committed.
- **A code-reviewer subagent** ([`.claude/agents/code-reviewer.md`](.claude/agents/code-reviewer.md)).
  Before each commit, a separate Claude reviews the change for bugs, security and readability.
  - **Read-only:** it can find problems but can't change code I haven't approved.
  - **Project memory:** it keeps notes on past findings, decisions and my recurring
    mistakes, so it doesn't re-raise things I chose not to fix.
  - **What it has caught** (each one fixed before the commit):
    - A package size of 0 would show a food as *free*, a wrong number that looks right
      ([fix](https://github.com/danikcompeng/meal-cost-tracker/commit/599293a)).
    - A "check your numbers" warning disappeared too early after changing a food's unit
      ([fix](https://github.com/danikcompeng/meal-cost-tracker/commit/9e1360b)).
    - On the daily food log it found six bugs
      ([fix](https://github.com/danikcompeng/meal-cost-tracker/commit/8ca92ae)), including:
      - **Rounding errors that grew with every edit.** Logging 1 g of rice, then changing it
        to 500 g, cost $2.50 instead of $2.48. Now exact values are stored and only the
        screen rounds.
      - **"1,000" read as 1**, because a comma can be a decimal point in some countries.
        Ambiguous numbers are now refused with a clear message.
      - **An app left open overnight could log breakfast to yesterday.** It now checks the
        date when you come back to it.
      - A dropped connection replacing the whole screen, keyboard focus not returning after
        closing a panel, and an empty-search message that read "No food called \"\"".
- **Tests on the logic that matters.** Cost, nutrition, totals and validation are pure
  functions with unit tests, including a hand-checkable example
  ($4.50 for 2 lb of rice → $0.74 per 150 g serving).
- **Debugging from logs, not guesses.** The app shows friendly errors to users but logs the
  real reason on the server. That's how I found a login bug that turned out to be a wrong
  Supabase URL, then an email rate limit.

My running notes, design rules and screen reviews are in [`notes.md`](notes.md).

## Design

Black ink on white with one matcha-green accent, Figtree for everything: bold for titles
and the big number, regular for the rest (it has tabular numbers, so prices line up). Each screen has one
main number. References and before/after screenshots are in [`design/`](design/).

## Running it locally

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # unit tests
```

You'll need a Supabase project. Put its URL and publishable key in `.env.local`
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) and run the SQL files
in `supabase/migrations/` in order.
