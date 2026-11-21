# Code reviewer memory: Meal Cost Tracker

## Topic files
- [Code map](code-map.md) — where each feature's code + migration lives (cost, log, recipes, motion...)
- [Decisions](decisions.md) — approved choices and won't-fix items per feature; don't re-raise
- [Deferred](deferred.md) — accepted issues with a "remind when..." trigger (purchases, price)
- [Review history](review-history.md) — every past review + findings. Latest 2026-11-20 motion 9-10
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
- Active work (2026-11-20): motion pass on branch `motion`, plans/motion.md. Items 1-10, phone
  checks 1-2, sheet slide-down done and reviewed; phone check 3 + whole-branch review next.
