---
name: patterns
description: Mistakes that recur in Meal Cost Tracker code (async outliving components, null propagation, stale comments, latches...) to check early in every review
metadata:
  type: feedback
---

Repeat offenders (explain in a new way each time; concrete walk-throughs work best)
- Async code that outlives its component: after every await or animation .then, re-check a
  cancelled flag / card id. Raised 6+ times (camera, scan-flow, recipe-view, today-view, swap fly-off,
  shared swap status, toast Undo replaced). "Had focus" read before an await is stale after it.
- Comments promising another function's behaviour: verify. "Framer reduced motion leaves height
  alone" raised 3x (it JUMPS it; see [[framer-motion]]); 3rd in motion-provider.tsx, offline-strip.tsx.
  "Change one, change the other" notes: check the OTHER file has the matching note.

Data
- Postgres numeric arrives as string: Number()/numberOrNull at every new read.
- Null must propagate: no `?? 0` on price/nutrients; guard servings / package_size = 0.
- Every new action/read must logDbError before a friendly message; throwing helpers inside
  guarded() (never suggest redirect() inside guarded()).
- Rounding then re-scaling stored values compounds error. Validation vs numeric(p,s) precision.
- Read-then-update actions: put checked conditions in the update's .eq() filters too.
- NOT NULL migrations: old live code may still write null between SQL and deploy. Manual SQL
  backfills bypass RLS: scope by id/user. Reads without .limit() feeding "never" claims truncate.

UI state
- Live hints on every keystroke flash for partial numbers (2000 passes 2, 20).
- Optimistic hidden-id sets must be pruned against the server list; "already gone" isn't an error.
- Closures holding an index go stale mid-await.
- Derived UI (open || hasError) flips back: latch it; every latch needs a reset path (Back).
- A saved value old rules FORCED isn't the user's choice.
- <dialog>: React removes it before close(), focus not restored (bottom-sheet.tsx handles it);
  Esc/backdrop/X should respect pending.
- Undo toast never times out (2026-11-15): every toast needs focusAfter; text can go stale.
- New list exits with height need meal-section's reduceMotion branch (all under MotionProvider).

Wording
- Shared error wording reused where it no longer fits ("or leave it blank" on a required field).
- Errors shown far from their control. Text claiming a position/cause must hold for every order.
- Every "—" needs a "who's missing it" line. Count words branch on 1 (unitWord/amountText).
- Help text naming screen positions: Chrome Android can put the address bar at the bottom.
