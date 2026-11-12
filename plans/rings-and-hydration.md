# Rings and hydration on Today (approved 2026-11-11)

Update: the water goal is no longer optional. Everyone starts at 2,000 ml
and Settings has a "Show water on Today" switch instead of a blank goal
(plans/duplicates-and-water-goal.md, migration 010).

Goal: fewer numbers at a glance.

## Decisions
1. Small rings show what's eaten ("62 g"), not what's left. Only the big
   calories ring shows "kcal left".
2. "Counts toward hydration" is on by default for a new ml food whose name
   contains the word "water". Touching the switch makes it yours.
3. The user switches their Water food from g to ml after 009, then runs a
   one-line backfill for past Water entries (1 g of water = 1 ml).
4. Cost line stays visible when folded; with a missing price it says
   "Today costs at least $7.62".
5. Only ml foods count toward hydration for now. "each" drinks (1 bottle)
   are on the reviewer's deferred list.

## Default layout (today, targets set)
- Grey "Calories today" label.
- Big ring, ~176 px, centered, starts at 12 o'clock, rounded ends.
  Inside: "860" 48 px bold matcha, "kcal left" 13 px; "up to" above when
  some foods lack calories. Over: ring full, "120 kcal over" in ink, no
  red. Six-character numbers drop to 40 px.
- Row of small rings (~56 px): protein, carbs, fat, water. One number
  under each ("62 g", protein in matcha), grey word under it. Water shows
  "750 ml" or "1.3 L".
- "Show details" button (real button, aria-expanded, 44 px), chevron.
- Cost line: "Today costs $7.62" / "Today costs at least $7.62".
- Track = today's bar track color; fill = matcha-soft (never text; every
  ring has its number written next to it). One accent for all rings.

## Expanded
Rings stay; button reads "Hide details". Opens: "1,140 of 2,000 kcal
eaten", rows "Protein 62 of 140 g · Goal reached", Carbs, Fat, "Water
1,250 of 2,000 ml" (label left, amount right, "+ N unknown" under), the
sugar / fiber / sat fat / sodium grid (same hide rule), and under the cost
line "+ 1 food without a price". Remembered per device in a cookie, so
the server draws it open or closed with no jump.

## Other states
- Past days and no targets: no rings. Big "1,840 kcal", the same four
  numbers in the same places without circles. Details say "62 g".
- One target blank: that slot shows its number with no ring.
- No water goal: water number, no ring. No hydrating foods and no goal:
  water slot hidden (three slots).
- Empty today with targets: empty rings, "2,000 kcal left".
- First use unchanged; "Set daily targets" link stays.
- Skeleton: big grey circle and a row of small ones.

## Accessibility
Rings aria-hidden; the visible numbers are read. Tapping the rings block
runs the same toggle as the button (bigger finger target, not a second
Tab stop).

## Motion
Fill 0.8 s ease-out from the top, clockwise; big ring first, small ones
~60 ms apart. Logging moves rings from where they were. Over: text to ink
with a 150 ms fade. Details: 200 ms height + fade, chevron turns. Reduced
motion: rings drawn full, details instant (switched off by hand: Framer
Motion's setting doesn't cover ring fills or height). No count-up numbers.

## Hydration
- Food form: ml foods get a "Counts toward hydration" switch
  (role="switch", 44 px) under "Measured by". Cleared when the unit isn't ml.
- Logging snapshots water_ml (the amount when the food counts, else 0);
  editing the amount scales it. 0, never null: a non-hydrating food adds
  nothing, it isn't unknown. No "+ unknown" for water.
- Settings: "Water" ml box in Daily targets, optional, 1-10,000, can't be 0.

## "<1 g"
A nutrient above 0 that rounds to 0 shows "<1 g" / "<1 mg" on Today (whole
numbers) and "<0.1 g" in rows and previews (1 decimal). Kcal too. Prices
unchanged.

## Data (migration 009)
- foods.counts_toward_hydration boolean not null default false, only true
  for ml (check). Backfill: true for ml foods named like "water".
- meal_entries.water_ml numeric not null default 0, >= 0.
- user_settings.daily_water_ml integer 1-10000, optional.
- RLS unchanged. Run 009 before deploying.

## Files
lib: targets, day-totals, nutrition, food-validation, hydration (new),
macros (the "<" rule), settings, settings-actions, entry-actions, foods,
entries, types (+ tests). components: progress-ring (new), summary-rings
(new), summary-details (new), day-summary, hydration-switch (new),
food-form, targets-form, today-skeleton, today-view. app/page.tsx reads
the cookie. CLAUDE.md schema.
