---
name: deferred
description: Known Meal Cost Tracker issues the developer deferred, with the trigger for when to remind them (targets per day, each drinks, purchases, ?log= race, nullable price)
metadata:
  type: project
---

- Targets per day: not stored per day, so past days show no bars. Revisit when per-day targets
  are built (2026-11-11).
- "each" drinks toward hydration (2026-11-11): only ml foods count, so a "1 bottle" water saved
  as each can't. Needs ml-per-item. Remind when touching counts_toward_hydration / water_ml.
- "Bought another?" (2026-11-11): with Kitchen/purchases, scanning a food you have should offer
  to record a new purchase, not only Log it. Remind on purchases or lookupBarcode "mine".
- Today ?log= race (2026-11-11, accepted): a sheet opened in the ~1 s after closing the scanned
  food's sheet disappears (TodayView key change). Don't re-raise unless seen in use.
- Nullable price (2026-11-14): when purchases replace foods.price, toFood's Number(row.price)
  would turn null into $0. Remind when reviewing purchases / "no price yet".
