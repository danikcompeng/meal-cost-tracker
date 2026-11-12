# Duplicate foods and a default water goal (approved 2026-11-11)

Two separate commits: duplicates first (no migration), then water (010).

## 1. Duplicate foods
- When: saving a NEW food (by hand or after a scan) whose name and brand
  match one of yours, ignoring case and extra spaces. Blank brand only
  matches blank brand. Editing a food never asks. Two matches: offer the
  newest.
- Checked on the server before anything is saved. Barcode duplicates keep
  today's "You already have a food with this barcode. Log that one".
- Dialog (native <dialog>): centered card, screen width minus 16 px each
  side, popover color, bordered, dimmed backdrop.
  - "You already have Rolled oats" (18 px semibold), "· Quaker" in grey.
  - "Update it with these numbers, or keep both?"
  - Up to three "what would change" lines in 13 px ("Protein 13 g →
    11 g", "Price $0.70 → $0.76 per 100 g"), then "and 2 more"; "Same
    numbers as the one you have" when nothing differs.
  - Grey: "Past days keep the numbers they were logged with."
  - Stacked 44 px buttons: Update existing (matcha), Keep both
    (outlined), Cancel (plain). Focus starts on Cancel. Esc / backdrop
    = Cancel.
- Update existing: new numbers, unit, price and hydration switch onto the
  existing food. A new barcode is added; no barcode never wipes one.
  Source unchanged. After a scan, Log it opens for that food. Past log
  entries untouched (snapshots).
- Keep both: saves a second food. Cancel: back to the form, nothing lost.
- Motion: 150 ms fade + scale from 97%; reduced motion: fade only.

## 2. Water goal 2,000 ml for everyone
- Settings, Daily targets tile: the four boxes unchanged, then a "Water"
  section: "Show water on Today" switch (on by default), and a half-width
  "Daily goal" ml box shown while on. Hidden but kept while off. Can't be
  blank or 0: "Enter a goal in ml, like 2000." One Save button.
- Today: ring on = water ring from day one. Off = water slot gone,
  folded and in details (three small rings). Past days still no rings.
- Migration 010: daily_water_ml blanks -> 2000, default 2000, not null,
  1-10000; new user_settings.show_water boolean default true. No settings
  row = 2,000 ml, ring on. RLS unchanged. Run 010 before deploying.
- "Set daily targets" link only looks at calories, protein, carbs, fat.
