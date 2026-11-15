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
  Picking a food already in the recipe opens its edit sheet. No Playwright yet.

Won't fix
- formatMoney shows "$0.00" for values < $0.00005 (2026-11-07).
