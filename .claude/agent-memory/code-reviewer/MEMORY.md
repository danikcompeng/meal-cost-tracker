# Code reviewer memory: Meal Cost Tracker

## Topic files
- [Code map](code-map.md) — where each feature's code + migration lives (cost, log, recipes, motion...)
- [Decisions](decisions.md) — approved choices and won't-fix items per feature; don't re-raise
- [Deferred](deferred.md) — accepted issues with a "remind when..." trigger (purchases, price)
- [Review history](review-history.md) — every past review + findings. Latest 2026-11-24 impeccable (Foods)
- [Patterns](patterns.md) — recurring developer mistakes; check these first in every review
- [Framer Motion](framer-motion.md) — verified reduced-motion, drag, animate().then, press facts
- [UI and a11y](ui-a11y.md) — button states, Tailwind v4 order, focus rings, SR, contrast, sizes
- [Platform](platform.md) — Next 16 / React 19 / Supabase facts (offline refresh, Activity re-show)

## Quick facts
- No Bash in reviews: read files directly (no git diff); git status comes in the prompt. Compiled
  CSS can be checked in .next/static/chunks/*.css (or .next/dev/...); library code in
  node_modules/motion-dom and node_modules/framer-motion/dist/es.
- Developer is learning and responds well to concrete worked examples (rice test, slow network
  walk-through, "you press the card 100 ms after it appears"); keep using them.
- App renamed "Staple" 2026-11-21, then "Bitewise" 2026-11-23 (repo/Vercel keep "meal-cost-tracker", live at trybitewise.vercel.app (stapleapp + meal-cost-tracker redirect there); login email template neutral, shared with the habit tracker; name in lib/app-identity.ts; "staple meals" lowercase is still the concept).
- Active work (2026-11-23): branch `servings`, "1 bagel = 80 g" on foods (migration 012).
  Demo merged: any new food/recipe-changing action needs sampleRefusal (see code-map Demo).
- Playwright e2e exists since 2026-11-22 (branch `playwright`): tests hit the LIVE demo account;
  e2e expectations hard-code demo-seed numbers, so a demo-seed.ts change must update them.
