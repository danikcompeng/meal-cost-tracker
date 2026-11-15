# Code reviewer memory: Meal Cost Tracker

## Topic files
- [Code map](code-map.md) — where each feature's code + migration lives (cost, log, recipes...)
- [Decisions](decisions.md) — approved choices and won't-fix items per feature; don't re-raise
- [Deferred](deferred.md) — accepted issues with a "remind when..." trigger (purchases, price)
- [Review history](review-history.md) — every past review and its findings. Latest: 2026-11-14
  recipes step 2, Minor issues.

## Quick facts
- No Bash in reviews: read files directly (no git diff); git status comes in the prompt.
- Migrations run by hand in the Supabase SQL editor; code reading a new column breaks prod if
  deployed first.
- foods.price is NOT NULL today; "no price yet" only becomes real with purchases.
- Next 16 + cacheComponents: dynamic params read via params.then inside Suspense is the
  documented pattern; revalidatePath in an action purges the whole client router cache.

## Patterns to watch
- Comments that promise behaviour of another function (e.g. "the hint flags it"): verify them.
- Postgres numeric arrives as string: Number()/numberOrNull at every new Supabase read.
- Null must propagate: no `?? 0` on price or nutrients; guard servings / package_size = 0.
- Swallowed errors: every new action/read must logDbError before returning a friendly message.
- Server actions that call throwing helpers must be wrapped in guarded(), or the throw escapes
  to error.tsx. Don't suggest redirect() inside guarded() (its try/catch would swallow it).
- Live hints computed on every keystroke flash for partial numbers (typing 2000 passes 2, 20).
- Rounding then re-scaling stored values compounds error; round only for display.
- Form validation vs DB column precision (numeric(p,s) rounding vs CHECK > 0).
- Async code that outlives its component: after every await, re-check a cancelled flag /
  request id before touching state or the router. Includes form callbacks (onSaved -> parent
  setSheet) that fire after the sheet was closed (camera hook, scan-flow, recipe-view).
- UI state derived from a live condition (open || hasError) flips back when it clears; latch it.
- A saved value the old rules FORCED isn't the user's choice (hydration false on non-ml food).
- <dialog> + React: React removes the element before close(), so focus isn't restored;
  bottom-sheet.tsx handles it, new dialogs must too. Esc/backdrop/X should respect `pending`.
- NOT NULL migrations: old live code may still write null between SQL and deploy.
- Shared error wording ("or leave it blank") reused for a field that is now required.
- Manual backfills in the SQL editor bypass RLS: always scope them by id/user.
- Errors shown far from the control that caused them (unit-lock under Package size).
- Developer responds well to concrete worked examples (rice test); keep using them.
