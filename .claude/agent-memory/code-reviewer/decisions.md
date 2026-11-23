---
name: decisions
description: Approved Meal Cost Tracker product/code decisions and won't-fix findings, per feature, that should NOT be flagged or re-raised in reviews
metadata:
  type: project
---

General
- Unit prices for g/ml shown "per 100" ($0.70 / 100 g); "each" per item. Currency USD (en-US).
- Inside recipes the UI says "ingredients" on purpose; recipe_ingredients keeps its name.
- "Can't calculate" = null, never 0, shown "—". Macros optional; missing = null.
- Log entries snapshot name/unit/nutrients/cost at log time; editing scales the entry's own
  snapshot. Day totals = known sum + "+ N foods without ...".
- Next 16 error.tsx prop is `retry`, not `reset`. Don't flag.
- Users can edit their own snapshot numbers via the raw Supabase API: own data, accepted.

Per feature (all approved, don't re-raise)
- 0 kcal rule (005): kcal 0 + blanks + typed all 0 -> blanks saved 0; contradictions left null.
  Fills sugar/fiber/sat fat, NEVER sodium; sodium > 0 doesn't block it. Fiber not vs carbs.
  Sodium per-100 g limit 39,400. OFF sodium_100g is grams (x1000); salt-only x400.
- Targets (2026-11-11): whole numbers; blank = no target; kcal 0 refused, 0 g allowed. Over
  target = plain ink, never red. progress() uses the ROUNDED total on purpose. tz in a cookie.
- Barcode (2026-11-11): OFF server-side, User-Agent "MealCostTracker/0.1 (url)", no email.
  Own food scanned -> straight to Log it. kJ /4.184 with a note. Price blank after a scan.
- Rings (2026-11-11): small rings eaten, big ring "kcal left"; "water" names default the switch
  on; only ml counts; cost "at least" with a missing price; water_ml never null; past days no ring.
- Duplicates (2026-11-11): native dialog, focus on Cancel, max 3 change lines, price per 100 g,
  newest match offered, editing never asks, barcode clash keeps "Log that one".
- Water goal (2026-11-11): 2,000 ml for everyone; "Show water on Today" off hides water on Today
  but keeps the goal; goal never blank/0; no row = defaults.
- Recipes (2026-11-14): any ingredient missing a value -> that recipe total "—" (NOT "+ N
  unknown"); a logged recipe saves it null. Water never null. Steps column unused for now.
  Picking a food already in the recipe opens its edit sheet.
- Playwright (2026-11-22): e2e + recorder run against the LIVE site via "Try the demo" only,
  reset before each test/take and at the end; workers 1. Files are *.e2e.ts so Vitest skips them.
  ffmpeg-static deliberately NOT in package.json (its install script exits 1 on failed download
  -> would break Vercel builds); found via FFMPEG_PATH / PATH / --no-save. Don't re-raise.
- Swap (2026-11-14, plans/swap.md "Approved with these answers" overrides section 0):
  "foods you have" = foods eaten in last 7 days (alone or in a recipe, recipe's CURRENT
  ingredients), worded "you've had this week", never "in your kitchen" until purchases.
  Servings stay the same. Recency is the LAST group on purpose. Protein 15% or 2 g; cost
  10% or $0.25; recent = < 3 days; history 60 days. "Not had it in 60+ days" also for new
  recipes (worded true either way). Swap is recipe -> recipe only.
- PWA (2026-11-15, plans/pwa.md): no service worker (offline = phone's own page); status bar
  "default"; manifest colours light-only (dark via theme-color tags, Android splash white);
  id "/" forever; short name "Meal Cost". proxy skips /icons/ by path as well as by .png ending:
  the developer asked for that explicitly. Next 16 emits mobile-web-app-capable (not apple-), fine.
  Undo toast bottom 6rem + inset (fix 5a, approved). No maximum-scale=1 (keeps pinch zoom).
  Login code (step 3): Confirm signup template left without {{ .Token }}, since only the owner
  uses the app (coordinator to tell them). Code field accepts 6-10 digits; dashboard says 8.

- Polish (2026-11-15, plans/polish.md): Undo message stays until ×/Undo/newer message/leaving
  Today, for everyone, no timer (web can't detect VoiceOver). Don't suggest a timeout again.
  Delete in the edit sheet gets the same Undo message as the swipe (item 4).
  Item 4 sent to notes.md "Polish later" (don't re-raise as new): swap-stack flick on pointercancel,
  edit-form deleteError precedence + Yes-delete focus/role=alert, last row in a meal has no exit,
  first-use return hides the toast, VoiceOver activeElement (phone test). Already-deleted = no Undo.

- Motion (2026-11-18, plans/motion.md, decisions A-F first option except D = own account): rows
  press 0.985, buttons 0.97 (all Buttons, full-width ones too); row exit keeps height (B); ring fill
  800 ms is the one exception (C); no press on swap card, Delete strip, text links, rings, switch,
  inputs. Items 3-10 built later, one commit each; reviewer runs before each phone check.

- Demo (2026-11-22, plans/demo.md "Known limits", accepted): demo token usable against Supabase
  directly (change data/password/metadata), shared meals between visitors, double seed in the
  same second, Supabase per-IP sign-in limit. Login page static: button presence fixed at build
  (Vercel env changes need a redeploy anyway). Don't re-raise these.

Won't fix
- formatMoney shows "$0.00" for values < $0.00005 (2026-11-07).
