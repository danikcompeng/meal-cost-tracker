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
  7th (2026-11-20): AnimatePresence keeps a closed sheet mounted 200 ms, so its window keydown
  (SwapStack arrows) and listeners still act; check useIsPresent in anything kept for an exit.
- "Done once at exit start" (closing ref, dialog.close) + a constant AnimatePresence key: a
  re-open within the exit revives the SAME instance -> stale state (invisible sheet, 2026-11-20).
- Leftover subscriptions: x.on("change") made in a handler must be removed on every way out
  (card change, unmount), not only when it reaches its goal.
- Comments promising another function's behaviour: verify. "Framer reduced motion leaves height
  alone" raised 4x (it JUMPS it on motion components; see [[framer-motion]]); 4th = collapse.tsx
  header + plans/motion.md:249, contradicting CollapseIn's own (correct) docstring.
- "Once per answer / once per show" effects vs cacheComponents Activity: hidden pages re-run ALL
  effects on re-show with unchanged state (2026-11-20: use-focus-first-invalid refocus + reshake).
  Guard with a ref holding the last handled value. Module-level "last seen" vars also persist
  while you're on another page (DaySlide lastDay).
  8th (2026-11-24): FoodForm action's onDone -> FoodManager close() closes a form opened since
  (tap another food while Saving…). Suggest a session counter captured by onDone.
- "Focus fell to body?" checks right after closing something inside AnimatePresence: the exiting
  subtree still holds focus for 200 ms, so keyboard never matches; iPhone taps (body) always do
  and draw a ring. Record "focus was inside" at the press instead (food-row notePress pattern).
- Props that only seed useState (startOpen from ?new) go stale under Activity re-show.
  "Change one, change the other" notes: check the OTHER file has the matching note.

- One rule computed in two places from different inputs (swipe sign from card x, commit from
  finger offset, 2026-11-23): check they agree in every start state, and suggest one pure function
  in /lib used by both. Feedback that shows while the action is refused (pending) is the same smell.
- Accent-preset tests filter checks by name (/primary|ring/): any new hue-dependent token whose
  check name lacks those words is silently skipped for presets (swipe-pick, 2026-11-23).

Data
- Postgres numeric arrives as string: Number()/numberOrNull at every new read.
- Null must propagate: no `?? 0` on price/nutrients; guard servings / package_size = 0.
- Every new action/read must logDbError before a friendly message; throwing helpers inside
  guarded() (never suggest redirect() inside guarded()).
- Rounding then re-scaling stored values compounds error. Validation vs numeric(p,s) precision.
- Read-then-update actions: put checked conditions in the update's .eq() filters too.
- Guards that ignore { error } fail OPEN (sampleRefusal 2026-11-22): a check that protects
  something must refuse + log when it can't read, not wave the change through.
- "Marker saved last, so a failure redoes it": check an OLD marker isn't left in place.
- NOT NULL migrations: old live code may still write null between SQL and deploy. Manual SQL
  backfills bypass RLS: scope by id/user. Reads without .limit() feeding "never" claims truncate.

UI state
- Live hints on every keystroke flash for partial numbers (2000 passes 2, 20).
- Live previews built on the WHOLE validateFood(fields) vanish when an unrelated new field is
  half-filled (water goal 2026-11-11, serving 2026-11-23). Check every new form field against them.
- New food column: check duplicateChanges (food-duplicates.ts) lists it, or "Update existing"
  changes it silently (servings 2026-11-23).
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
