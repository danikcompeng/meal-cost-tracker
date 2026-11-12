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
