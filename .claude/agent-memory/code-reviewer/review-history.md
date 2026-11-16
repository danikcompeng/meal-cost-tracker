---
name: review-history
description: Past code reviews of Meal Cost Tracker features (date, verdict, what was raised) - check before re-raising a finding
metadata:
  type: project
---

- 2026-11-07 lib/cost.ts: 1a/1b/3a fixed, verified. Looks good.
- 2026-11-09 rename ingredients -> foods: Minor issues, fixed same day except 3d.
- 2026-11-09 macros on foods: Minor issues (unit-note clearing, segmented track invisible,
  36px segments, calorieHint comment 20% vs 25%).
- 2026-11-09 daily food log: Minor issues (rounded-snapshot drift, throws -> error.tsx, stale
  day past midnight, "1,000" -> 1, unlogged getRecentFoodIds error). Since fixed.
- 2026-11-09 0 kcal fills blank macros: Looks good / minor (comment vs calorieHint, tests).
- 2026-11-11 daily targets: Minor issues, matches plan. RLS/upsert/CHECKs correct, no null->0.
  Raised: run 006 BEFORE pushing; low-calorie note flashes while typing 2 -> 2000; 20% boundary
  test missing; page fn `Targets` shadows type name; header at 320 px unsure.
- 2026-11-11 barcode scanning: Minor issues, matches plan. Security clean (re-validated input,
  RLS-scoped lookup, digits-only OFF URL). Raised: run 007 first; test on a branch preview; X
  during "Looking up" then "mine" still router.replace()s; no cancelled check after await
  video.play(); typed 8-digit UPC-E saved as 8 digits (dup later); some errors unlogged; ?log=
  remount race (accepted, see Deferred); found result is a full page, not the plan's panel.
- 2026-11-11 more nutrients: Minor issues. validateMacros, fill rule, 008 backfill, RLS, null
  handling correct. Raised: run 008 first; "More nutrients" open derived from hasError collapses
  mid-typing (latch it); water 0s alone show extras grid; "Blank macros" hint about folded boxes;
  sodium "1,170" refused as ambiguous.
- 2026-11-11 rings + hydration (uncommitted): Minor issues. Ring SVG, disclosure (button outside
  the click wrapper, inert, cookie), 009 order/regex/check, scaleSnapshot water, "<" rules fine.
  Raised: editing a g food to ml shows the switch OFF (saved false was forced, not chosen) =
  the plan's Water g->ml step; plan's one-line Water-entries backfill SQL not written anywhere
  (SQL editor bypasses RLS, scope by food id); run 009 first; 4 x 56 px rings in 53 px columns
  at 320 px; amountText "0 g" for 0.001-0.004 amounts; summary.ts:82 duplicates totalNumber "<1".
- 2026-11-11 duplicate foods (commit 30577b4, unpushed): Minor issues. Verified submitter
  name/value reaches the action (react-dom uses new FormData(form, submitter); Base UI Button
  passes type/name/value). Raised: Update replaces a DIFFERENT existing barcode silently (scan
  ping-pong); Esc/backdrop still cancel while pending; update also overwrites name/brand
  spelling (plan says numbers only); comment claims focus returns to Save (it doesn't, same
  reason as bottom-sheet.tsx); optional: render dialog after Save so it's never the default
  button; getFoodsNewestFirst duplicates getFoods.
- 2026-11-11 water goal 2,000 ml + show_water switch (commit e9757d6, unpushed): Minor issues.
  010 order/transaction/CHECK/RLS fine; getTargets no-row/old-row fine; hidden goal box still
  submitted (hidden != disabled); no leftover null-water code. Raised: deploy right after 010
  (old live code upserts water null -> NOT NULL fails for first-time savers); water "-5"/"abc"
  error says "or leave it blank" (blank is refused); calorie hints vanish while water box is
  blank (preview.ok false); stale server water error reappears after off -> reset -> on;
  010 re-run errors on add column (use if not exists; safe anyway); fieldset/legend so screen
  readers hear "water" with "Daily goal"; missing showWater field = off (maybe !== "false");
  showsWater() is now a one-line wrapper.
- 2026-11-14 recipes step 2 (uncommitted: Kitchen switch, list, recipe screen, ingredients):
  Minor issues. sumOrNull "—" rule, upsert + RLS, delete/unit lock, uuid guard, no null->0 all
  correct. Raised: closing the Add sheet while "Adding…" -> onSaved setSheet re-opens it (or
  replaces another sheet); Remove not disabled while saving (remove then upsert re-adds it);
  unit-lock error shows under Package size, far from "Measured by", and stays after switching
  back; Kitchen pill ~98 px in a 96 px column at 320 px (check); nits: per-serving maths
  recomputed in 3 components, usedInRecipesMessage in recipe-totals.ts, FK code const in 2
  files, /recipes loads all foods for hasFoods. Future: toFood Number(price) when price nullable.
- 2026-11-14 recipes step 3 (uncommitted: logging recipes from Today): Minor issues. logRecipe
  re-reads recipe, empty-recipe guard, null propagation, water, unit 'serving', 011 checks/RLS,
  servings cap on log + edit, tests all correct. Raised: onDone after closing the sheet closes a
  sheet opened since (3rd time; suggested identity check setSheet(s => s === mine ? null : s));
  "no price yet per serving" wording; focus drops to <body> on recipe pick (no autoFocus, on
  purpose for one tap: suggest a comment + focus the name/Log it); nits: LogFoodForm back says
  "All foods", option button classes duplicated, `grouped` ignores onPickRecipe, Today now errors
  if getRecipes fails (optional fallback).
- 2026-11-14 swap step 1 (uncommitted: lib/swap.ts ranking, daysBetween, getEatenHistory in
  entries.ts): Minor issues. Group order, 15% EPSILON, cents chips, id tie-break, servings
  scaling all correct. Raised: cost-unknown note "so it's further down" false when that recipe
  ranks 1st (cost is key 3); kcal "—" never says who's missing it (no kcalMissing); 1,000-row
  Supabase cap can drop old recipe rows -> false "Not had it in 60+ days"; current-unknown
  protein = tie but current-unknown cost still sinks unknowns (inconsistent, plan says tie for
  both); "Not a close match: ..., $0.62 cheaper" repeats the chip; CLAUDE.md "uses the most
  ingredients" vs "fewest to get" (toGet is fine-grained, cost rarely decides); no cost-band
  boundary tests; SwapCurrent.recipeId unused; localeCompare locale; swap-card.tsx untracked
  outside step 1; no servings > 0 guard (0 -> "Same cost" for all).
  Re-check same day: all fixed and tested (1c entries.ts split moved to step 2). OK to commit.
  Nits left: RankedSwap.notes doc still says "why it's lower"; CLAUDE.md:27 "uses the most
  ingredients" still differs from "fewest to get" (developer's own wording, their call).
- 2026-11-14 swap step 2 (uncommitted: swap-sheet/stack/card/empty/button, recipe-view, page,
  getEatenHistory): Fix before committing. Verified fine: .limit() returns `this` so .not after
  it works; 60/7-day ranges; null on error/limit; leaving-ref guard vs swipe+tap; listener
  cleanup; Value "—"+sr "unknown"; label-in-name; overflow-x-clip maths; MotionConfig on Today.
  Raised: pointerdown on the flying card stops x's animation, .then never fires -> leaving stuck,
  dead stack (verified in motion-dom); Back mid-flight -> x.set doesn't stop it, stale index
  skips forward 2; close mid-flight still router.pushes (4th "outlives component"); flick
  against the drag side commits (offset +90, velocity -800 -> skip); Back to card 1 hides the
  focused Back (focus lost); restarted latch moves focus on Back-from-end; reasons before the h3
  (heading nav skips chips); dark mode --card == --popover so the card is invisible in the
  sheet; Open it gives no pending feedback (prefetch); e.repeat; nits: kcal change missing vs
  plan, proteinPerDollar formatting duplicated, pickLabel === "Open it" coupling, touch-pan-y
  redundant, CLAUDE.md still says carousel, step 3 needs a "pick failed" path.
  Re-check same day: all fixed (flyingId state + drag false, topId ref, jump(0), stop on
  unmount, same-side flick, prefetch + useTransition "Opening…", goTo flushSync + focus Skip,
  e.repeat, borders, h3 first + order-first, id-based top card, memoized current). Verified
  drag "x" -> false only calls controls.stop() which no-ops when not dragging. One new bug:
  flyingId is never cleared, so Back to the card you just skipped leaves it undraggable
  (pointer-events-none). Fix: setFlyingId(null) in the .then. Rest OK to commit.
- 2026-11-15 swap step 3 (uncommitted: swapEntry/undoSwap, validateUndoSwap, undo-toast, two-button
  entry row, ids.ts): Minor issues. Verified fine: snapshot from live recipe incl. amount/unit/name;
  update+select("id") catches 0 rows under RLS; undo .eq(recipe_id) guard; validateUndoSwap types,
  nulls, water, trim/100 = DB check, meal+servings unchanged; double tap (leaving ref), double Undo;
  edit->swap focus (cleanup focuses row before the swap sheet records opener); always-mounted status
  box; row key recipe+name; MotionConfig fades. Raised: swapping/swapError shared across sheets
  (close mid-swap: failure silent, next sheet shows "Swapping…" + old error; 5th "outlives");
  Swap/Skip `disabled` while pending drops keyboard focus (toast already knows aria-disabled);
  read-then-write gap (undo can leave amount 2 with 1.5's snapshot; add .eq amount/meal; comment
  overclaims); lost response -> retry says "already have"; iOS VoiceOver may not set activeElement
  (hadFocus, timer pause) - unsure; stale error under the next card (clear via onTop); Undo button
  kept after UNDO_CHANGED; two toasts overlap 200 ms; SWAP_FAILED/UNDO_FAILED duplicated.
  Re-check same day: all fixed (swapStatus tied to sheet, .eq amount/recipe_id/meal filters,
  focusableWhenDisabled, onTop by id, final Undo errors, mode="wait"). New: router.refresh() in
  the no-signal catch -> Next falls back to a full page load when the RSC fetch fails (verified
  render-tree.js exitStatus 2; experimental.useOffline is off) = offline browser error page;
  refresh only after a server answer. Also success does setSwapStatus(null) unconditionally,
  wiping another sheet's pending/error (use s?.sheet === mine). Rest OK.
- 2026-11-15 PWA step 1 (uncommitted: manifest, icons route, meta tags, proxy matcher): Minor
  issues, no bugs. Verified fine: ImageResponse prod cache-control is max-age=0 must-revalidate
  (no stale-icon risk); generateStaticParams in route handlers + unknown params at runtime = 404;
  maskable 0.56 square corners at 39.6% < 40% safe circle; matcher test regex ~ Next's (Next only
  adds optional _next/data prefix / .rsc suffix); vitest picks up root proxy.test.ts. Raised:
  globals.css --background/--primary lack the back-pointer to app-identity.ts the plan promised;
  layout.tsx re-implements iconByFile with `!`; manifest.webmanifest + favicon.ico in the matcher
  duplicate the ending rules (fine, just say so); optional comment on why 0.56.
