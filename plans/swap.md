# "I'm tired of this" swap (approved 2026-11-14)

Approved with these answers, which replace the drafts in section 0:
1. "Foods you have" is NOT left off. Until purchases exist, any food
   logged in the last 7 days (alone or inside a recipe) counts as
   "probably in my kitchen" and is ranked on. The card says it honestly
   ("Uses 3 foods you've had this week"), never "in your kitchen". The
   input stays shaped so purchases can replace it later.
2. Servings stay the same.
3. Swipe right on a recipe's screen opens that recipe.
4. CLAUDE.md describes the card stack with ingredient chips.
Undo: OK, but the server validates the restored numbers the same way as
any entry edit.

Changed after the step 1 code review (these replace the text below):
- A recipe eaten this week counts with the ingredients it has NOW: a
  log entry doesn't record which foods a recipe had back then.
- "Foods you'd need to get" is grouped none / 1 / 2 or more, so it
  doesn't drown out cost and recency.
- Unknown protein always sorts last, even when the current meal's is
  unknown too (the same rule as cost).
- Card notes never claim a position ("further down"): an unknown cost
  on the closest protein can be card 1. They say "Rolled oats has no
  price yet, so it can't be compared on price". Unknown calories get a
  "Banana has no calories." line too.
- "Not a close match: 6 g more protein." doesn't repeat a cost chip,
  and isn't shown when nothing is known to compare.
- History is two small reads (recipes for 60 days, everything for 7)
  so Supabase's 1,000-row limit can't cut it short; if either hits the
  limit it counts as "didn't load" instead of a guessed "60+ days".

Changed while building step 3 (swapping on Today):
- Undo checks the entry still has the recipe you swapped to, the same
  servings AND the same meal, both before writing and in the write
  itself; otherwise "It's changed since the swap, so it can't be
  undone." and the Undo button goes. The swap's write checks the entry
  is unchanged since it was read, too.
- A failed swap reloads the day (the swap may have saved and only the
  answer got lost). If you closed the sheet meanwhile, "Couldn't swap"
  shows in the message above the tab bar instead.
- After Undo, focus goes back to the row's swap icon.

"Tired of this?" opens a stack of your other recipes, best match first.
Swipe right (or tap Swap, or press →) to swap, swipe left (Skip, ←) to see
the next one. Swapping a logged meal replaces it in the same meal with a
fresh snapshot. No migration needed (section 5).

## 0. Decisions to confirm first

1. **"Uses foods I already have" can't tell recipes apart yet.** A recipe
   can only contain foods from your Foods list (the database requires
   it), so today every recipe would score 100% on it. What CLAUDE.md
   means by "in your kitchen" is a purchase you haven't marked used up
   (feature 4, the `purchases` table), and that isn't built.
   My suggestion: the ranking takes "which foods are in the kitchen" as
   an input, and until purchases exist that input is "not tracked yet".
   Not tracked means the step is skipped: it changes no order and no
   card claims "All in your kitchen". Same rule as everywhere else:
   unknown is never treated as a yes. When purchases land, it switches
   on with no change to the ranking code.
   (A stand-in now, like "foods you logged this week", would be a
   guess dressed up as a fact, so I'd rather not.)
2. **Servings stay the same.** Swap 1.5 servings of Overnight oats and
   you get 1.5 servings of Lentil dal, with a new snapshot worked out
   from the live recipe (1.5 x one serving now). The alternative,
   changing the servings so protein matches exactly ("1.2 servings of
   dal"), gives odd portions you'd have to measure. Comparing per
   serving and keeping the count gives the same ranking either way.
   The card shows numbers for the servings you'll get ("Cost for 1.5
   servings"), and you can change servings afterwards as usual.
3. **From a recipe's screen there's nothing logged to replace**, so
   swipe right there means "Open it": you go to that recipe's screen.
   (The other option is a "Log it" sheet straight from the card. I'd
   keep that for later, so this feature does one thing.)
4. **CLAUDE.md's design note says "ingredient tiles rotate like a
   carousel".** Your brief says a card stack. I'll update CLAUDE.md to
   the card stack; each card still shows its ingredients as chips, and
   the new meal still slides into Today's row after a swap.

Defaults I picked (easy to change, each is one constant in lib/swap.ts):
- "Similar protein" = within 15% **or 2 g, whichever is bigger**. For a
  small 5 g meal, 15% is under 1 g, which would match almost nothing.
- "Similar cost" = at most 10% **or $0.25** more than now.
- "Recently" = you ate it today, yesterday or the day before.
- History looked at: the last 60 days.

## 1. Phone layouts and motion

### Where "Tired of this?" lives
- **Today:** recipe rows get a small swap icon (lucide `Shuffle`) at the
  right edge, after the kcal, with a 44 x 44 px tap target. One tap
  opens the stack, as CLAUDE.md asks. Tapping the rest of the row still
  opens the edit sheet, which also gets a "Tired of this?" button under
  the servings box, for anyone who doesn't spot the icon.
  Food rows (Rolled oats, 150 g) don't get it: swaps are recipe to
  recipe.
  (Today the row is ONE button. A button can't sit inside a button,
  so the row becomes two buttons side by side. Same look.)
- **Recipe screen:** a quiet outlined button "Tired of this?" under the
  big cost number. Hidden while the recipe has no ingredients.

### The sheet
It's the existing bottom sheet, titled "Instead of Overnight oats".
Top to bottom:

```
 ‹ Back                        2 of 6
 ┌──────────────────────────────────┐
 │ (Similar protein) ($0.50 cheaper)│   chips
 │                                  │
 │ Lentil dal                       │   24 px bold
 │                                  │
 │ Cost per serving                 │   13 px grey label
 │ $0.62                    -$0.50  │   48 px bold matcha / grey change
 │                                  │
 │ 25 g        480        40 g      │   medium, protein in matcha
 │ protein     kcal       per $     │   13 px grey
 │ +1 g                             │   13 px grey, protein vs now
 │                                  │
 │ Red lentils · Rice · Onion · +3  │   ingredient chips, one line
 │ Last had 5 days ago              │   13 px grey
 └──────────────────────────────────┘
   ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾    two cards peeking behind
   [  ✕  Skip  ]   [  ✓  Swap to this ]
         ← Skip  ·  Swap →                  (only with a keyboard)
```

- **The card**: a soft grey tile (rounded 2xl, no shadow), full width
  minus the 16 px margins. Up to two reason chips at the top (matcha
  text, section 2 says which). The one big number is cost, as on the
  recipe screen; protein sits right under it because it's what the
  ranking cares about most. "vs now" changes are small grey text.
  Logged 1.5 servings? The labels say "Cost for 1.5 servings" and the
  numbers are for 1.5.
- **Missing values**: "—" where the number would be, and a grey line
  under the numbers naming who's missing it: "Protein unknown: Banana
  has no protein, so it's further down." No chip ever claims a match
  on a number we don't know.
- **The stack behind**: the next two cards peek out under the bottom
  edge (8 px and 16 px), slightly smaller (95%, 90%), with no text on
  them. On the last card there's nothing behind it, which tells you
  it's the last one before you get there.
- **Buttons**: Skip (outlined) and "Swap to this" (matcha) under the
  stack, 48 px tall, full width between them. From the recipe screen
  the right one says "Open it". "‹ Back" goes to the card you just
  skipped (for a skip by accident). "2 of 6" is the counter.

### The swipe
- The card follows your finger sideways and tilts a little (up to 8
  degrees), like picking up a real card. Dragging right fades in a
  "Swap" label on the card's top left corner in matcha; dragging left,
  "Skip" in grey.
- Let go past 96 px, or flick fast, and it commits: the card flies off
  that side and the next one grows from 95% to full size with a soft
  spring (about 250 ms). Let go before that and it springs back.
- Sideways only: scrolling the sheet up and down still works while
  your finger is on the card (Framer locks the direction once you've
  moved a few pixels).
- **Swap on Today**: the card flies off to the right, the Swap button
  shows "Swapping…", and when the server says yes the sheet closes. In
  the lunch section the old name slides out and "Lentil dal" slides in;
  the rings and totals ease to the new numbers. A message appears above
  the tab bar: "Lunch is now Lentil dal · 1.5 servings   Undo". It
  stays until you tap its × (changed from "10 seconds" in
  plans/polish.md, item 3). Undo puts back the exact entry you had
  (section 3).
- **If the swap fails** (no signal): the card slides back in from the
  right, and under it: "Couldn't swap. Please try again." Nothing
  changed.

### End of the stack
After the last card, a card-sized tile with a dashed border:
"That's all 6 of your other recipes." Buttons: "Start over" (back to
card 1) and "Keep Overnight oats" (closes). A quiet "New recipe" link
under them.

### Empty states
- **Fewer than 2 recipes** (this is the only one): the sheet shows a
  tile instead of a stack: "Swaps come from your own recipes" / "Add
  another staple meal and it'll show up here, matched on protein and
  price." Button: "New recipe" (goes to Recipes).
- **Other recipes exist but none has ingredients**: "Your other recipes
  don't have ingredients yet, so there's nothing to compare." Button:
  "Go to recipes".
- **Loading**: none. Your recipes and the last-eaten days load with the
  page, so the stack opens instantly.
- **History didn't load**: the "recently" step is skipped (a quiet log
  on the server), and no card says "Haven't had it in 5 days". The
  rest still works.
- **Phone width (320 px)**: chips wrap to two lines, the ingredient line
  shows fewer names and "+5", buttons stay side by side. Dark mode uses
  the same colour tokens.

### Reduced motion
With "Reduce motion" on (Framer's `reducedMotion="user"`, as on the
other screens): no tilt, no fly-off, no spring. The card still follows
your finger while you drag (you're moving it yourself), but changing
card is a 150 ms cross-fade, and Today's row fades to the new name
instead of sliding.

### Screen readers and keyboards
- The sheet is the existing `<dialog>`: focus stays inside, Escape
  closes it, the page behind is hidden from screen readers.
- Only the top card is readable. The peeking cards are empty, hidden
  (`aria-hidden`) and unclickable (`inert`).
- The top card is an `<article>` whose heading is the recipe name; it
  reads top to bottom in the same order you see: name, reasons, cost,
  protein, the rest. "—" is read as "unknown" (screen-reader text), not
  "dash".
- Swiping is never needed: Skip, Swap and Back are real buttons with
  names like "Swap to this: Lentil dal". (Screen readers use the arrow
  keys for themselves, so for them the buttons are the way.)
- After Skip or Back, focus stays on the button you pressed, and a
  polite announcement says the new card: "Lentil dal, 2 of 6. Similar
  protein, $0.50 cheaper."
- Arrow keys: ← skip, → swap, only while the sheet is open.
- The Undo message is announced (`role="status"`) and the Undo button
  is reachable with Tab.

## 2. The ranking: `lib/swap.ts` (pure, tested)

No database and no React, like lib/cost.ts. Two functions:

- `swapCandidates(recipes, current, lastEaten, today)` turns your
  recipes into plain numbers: protein and cost per serving (from the
  existing `recipeTotals`), who's missing each (`ingredientsMissing`),
  the food ids, and days since you last ate it. It leaves out the
  current recipe and recipes with no ingredients.
- `rankSwaps(current, candidates, { kitchen, recencyKnown, servings })`
  sorts them and writes each card's reasons and notes.

**What "current" is.** From Today: the logged entry's own snapshot per
serving (protein ÷ servings, cost ÷ servings), because that's what
your day actually counts, even if the recipe was edited since. From the
recipe screen: the recipe's live per-serving numbers.

**How it sorts.** Like sorting a spreadsheet by several columns: compare
the first column; only if that's a tie, look at the next. The columns
are coarse groups, not exact numbers, so the later ones actually get a
say (if cost were exact to the cent, recency would never matter).

1. Protein group: close (within the band) → known but not close →
   unknown.
2. Foods you'd need to buy: 0, 1, 2… (skipped while the kitchen isn't
   tracked, decision 1).
3. Cost group: cheaper or similar → pricier → unknown.
4. Recent group: not eaten in the last 3 days → eaten recently.
5. Ties after all that: closer protein (in grams), then cheaper, then
   longer since you ate it, then name A to Z, then id. The last two
   make the order the same every time, whatever order the recipes
   arrive in.

Unknowns always go last in their group, so a recipe never moves UP
because a number is missing. If the CURRENT meal's protein is unknown,
step 1 is a tie for everyone and the sheet says once, above the stack:
"Overnight oats has unknown protein, so these aren't matched on
protein." Same for unknown cost.

Trade-off to know: recency is last, as you ordered. If yesterday's meal
keeps coming first because it matches best, we can move recency to
second. It's one line.

**Reasons (the chips), at most two, in this order, only if true:**
- "Same protein" (same whole grams) or "Similar protein" (within band).
- "All in your kitchen" (only once the kitchen is tracked).
- "$0.50 cheaper" (at least 5¢ cheaper, for the servings you'll get)
  or "Same cost" (within 5¢).
- "Haven't had it in 5 days", or "Not had it in 60+ days" when it isn't
  in the history (that's also true of a brand-new recipe, so it's
  worded to be true either way).
- None true: no chips, and a grey line "Not a close match: 6 g less
  protein, $0.40 more."

**Notes (grey lines, never chips):** "Protein unknown: Banana has no
protein, so it's further down", "Rolled oats has no price yet", "Had it
yesterday".

Prices: right now every food has a price (the Foods form requires one),
so "unknown cost" can't happen yet. It will once prices come from
purchases ("no price yet" for a food you haven't bought), and the
ranking already handles it.

**Days since**: `daysBetween(day, today)` in lib/dates.ts, on the plain
dates stored in `meal_entries.day` (already in your timezone), done in
UTC like `addDays` so daylight saving can't make a day 23 hours.

## 3. Swapping a logged entry (server)

`swapEntry(entryId, recipeId)` in lib/entry-actions.ts:
1. Reads the entry and the new recipe from the database (yours only,
   by Row Level Security). Refuses: entry gone, not a recipe entry,
   recipe gone, recipe with no ingredients, or the same recipe.
2. Works out the snapshot with the existing `recipeSnapshotFor(recipe,
   entry.amount)`: the same servings, numbers from the live recipe.
3. **Updates the entry in place** (one database statement): recipe_id,
   name, unit 'serving', all 8 nutrients, cost, water_ml. The id, day,
   meal, status, servings and created_at stay, so it keeps its spot in
   the lunch list. (Delete-then-add would be two steps that can half
   fail, and the meal would jump to the bottom of the list.)
4. Sends back the entry as it was, for Undo.

`undoSwap(entryId, previous)` writes that old copy back. These numbers
come from your phone, which the logging rule normally avoids. Here it's
fine: they're your own entry's old numbers, the database still only
lets you change your own row, and the server checks they're sensible
(not negative, not text, servings unchanged) before writing. Re-working
them out from the old recipe instead would quietly change them if you'd
edited that recipe since.

An entry whose recipe was deleted (recipe_id empty) can still be
swapped: "current" comes from its snapshot.

## 4. Data the screens need
- `getLastEaten(today)` in lib/entries.ts: `recipe_id, day` of eaten
  recipe entries from the last 60 days up to today; the newest day per
  recipe is picked in lib/swap.ts (tested). Planned future meals don't
  count.
- Today already loads all recipes; it adds this read to its
  `Promise.all`. The recipe screen adds `getRecipes()` and this read.
- The ranking runs in the browser from those props, so opening the
  sheet needs no network.

## 5. Migration?
None. Everything is already there:
- `meal_entries` has recipe_id, unit 'serving' and every snapshot
  column, and its update policy already checks the new recipe is yours.
- Recency reads `meal_entries.day` and `recipe_id` (indexed in 011).
- Undo needs no table: the old copy travels in the message.
- The kitchen step will need the `purchases` table, but that's feature
  4's migration, not this one.

## 6. Files

New
- `lib/swap.ts`: `swapCandidates`, `rankSwaps`, `lastEatenByRecipe`,
  the constants.
- `lib/swap.test.ts`
- `components/swap-button.tsx`: the icon on Today's rows and the
  outlined button on the recipe screen.
- `components/swap-sheet.tsx`: which card you're on, Back, the end and
  empty states, the arrow keys, the announcement.
- `components/swap-stack.tsx`: the drag, tilt, fly-off and the cards
  peeking behind.
- `components/swap-card.tsx`: one card's contents (no state).
- `components/swap-empty.tsx`: the two empty states and the end tile.
- `components/undo-toast.tsx`: "Lunch is now Lentil dal · Undo".

Changed
- `lib/dates.ts` (+ test): `daysBetween`.
- `lib/entries.ts`: `getLastEaten`.
- `lib/entry-validation.ts` (+ test): `validateSwap`,
  `validateUndoSwap`.
- `lib/entry-actions.ts`: `swapEntry`, `undoSwap`.
- `components/entry-row.tsx`: two buttons side by side, swap icon on
  recipe rows.
- `components/meal-section.tsx`, `components/today-view.tsx`: a "swap"
  sheet, the toast, the name sliding in.
- `components/edit-entry-form.tsx`: "Tired of this?" button.
- `components/recipe-view.tsx`, `app/recipes/[id]/page.tsx`,
  `app/page.tsx`: load and pass recipes and last-eaten days.
- `CLAUDE.md`: card stack in the design section, the ranking rules.

Before using any Next.js API I haven't used in this repo yet, I'll read
its doc in node_modules/next/dist/docs first (AGENTS.md).

## 7. Tests (vitest, `lib/swap.test.ts` unless noted)

Picking candidates
- The current recipe and empty recipes are left out; one other recipe
  gives a stack of one; none gives an empty list.
- A deleted current recipe (id empty) still ranks the others.

Protein band
- 24 g vs 27.5 g (14.6%) is close, vs 28 g (16.7%) is not.
- Exactly 15% counts as close: 24 g vs 27.6 g. (Computers store 24 x
  1.15 as 27.599999…, so without a small allowance this would fail.
  The test catches that.)
- The 2 g floor: 5 g vs 6.5 g is close; 0 g vs 1.5 g is close.

Order of importance
- Close protein but pricier beats far protein but cheaper.
- Fewer foods to buy beats cheaper (with a kitchen set).
- Cheaper beats not-eaten-recently.
- Eaten yesterday goes below the same recipe not eaten in 5 days.
- Within a group, closer protein comes first, then cheaper.

Ties
- Identical numbers → A to Z by name; same name → by id.
- Shuffling the input gives the same output.

Missing stays missing
- Unknown protein ranks below known-but-far, never gets "Same protein"
  or "Similar protein", and gets a note naming the food.
- Unknown cost ranks below pricier, never gets "cheaper" or "Same
  cost", note says "no price yet".
- Current protein unknown → no protein chips for anyone, ranking falls
  through to cost. Current cost unknown → no cost chips.
- Kitchen not tracked → no effect on order and no kitchen chip.
- History didn't load → no effect on order and no "haven't had it".

Reasons
- At most two, in order; "Same" vs "Similar protein"; "$0.50 cheaper"
  is for the servings you'll get (1.5 servings → $0.75); under 5¢ is
  "Same cost"; nothing true → no chips and "Not a close match: …".
- Days: today, yesterday, 2 days (recent), 3+ days ("Haven't had it in
  3 days"), not in history ("60+ days").
- `lastEatenByRecipe` picks the newest day; ignores days after today.

Elsewhere
- `dates.test.ts`: `daysBetween` across a month end and the daylight
  saving weekend.
- `entry-validation.test.ts`: swap ids must be uuids; undo refuses
  negative or text numbers and a different servings count.
- `nutrition.test.ts`: swapping 1.5 servings gives 1.5 x one serving of
  the new recipe, unknowns stay unknown.

## 8. Build order (one commit each)
1. **Ranking**: lib/swap.ts, daysBetween, tests, CLAUDE.md rules. No
   screens change.
2. **The card stack, from the recipe screen**: "Tired of this?" button,
   sheet, swipe, buttons, arrow keys, Back, end and empty states,
   reduced motion, screen-reader text. "Open it" goes to the recipe.
   Nothing is written to your data in this step.
   **I stop here for your phone test:** open a recipe, swipe through,
   skip with ← on a laptop, go Back, reach the end, try it with Reduce
   Motion on (iPhone: Settings → Accessibility → Motion), with
   VoiceOver on, at 320 px and in dark mode, and with only one recipe.
3. **Swapping on Today**: the row icon and edit-sheet button,
   swapEntry, undoSwap, validation tests, the Undo message, the name
   sliding in. Phone check: swap 1.5 servings of lunch, see totals
   change, Undo, swap yesterday's dinner, swap while offline.

Not in this feature: the kitchen step switched on (needs purchases),
swapping food entries, swapping planned meals (planning isn't built),
"Log it" from the card.
