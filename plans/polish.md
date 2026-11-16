# Polish pass (approved 2026-11-15)

Approved with these answers, which replace the open questions below:
1. Item 3: the Undo message stays until dismissed, for everyone, with
   no timer. (Not the 30-second fallback.)
2. Item 4: the edit sheet's Delete button gets the same Undo message,
   using the same restore as the swipe.
3. Anything found but not fixed goes in a "Polish later" section in
   notes.md.

Five small fixes. Each is its own commit on a branch `polish`, reviewed by
the code-reviewer before it's committed, with `npm test` and
`npm run build` passing. When all five are in, push `polish` and stop for
the phone test. Nothing goes to `main`.

Where the list came from: notes.md has no "Polish later" section. Item 5
is from the code-reviewer's review history (PWA step 2). The others are
from the request.

---

## 1. "1 servings" becomes "1 serving"

**Where it goes wrong.** Labels made by `amountText()` (lib/units.ts) are
already right ("1 serving", "1.5 servings", "1 item"). The wrong ones are
the unit words written *inside* number boxes, which are fixed text:
- `components/amount-field.tsx`: "servings" / "items" inside the box, so
  logging or editing shows `[ 1      servings ]` and `[ 1      items ]`.
  The box is also empty-with-placeholder "1" for items and servings, so
  an empty box reads "1 servings" too.
- `components/recipe-form.tsx`: "Makes `[ 1 ]` servings".

**Fix.**
- `lib/units.ts`: a new `unitWord(amount, unit)` gives "serving" or
  "servings", "item" or "items", and "g" or "ml" unchanged. `amountText()`
  uses it, so both places follow the same rule.
- Inside a box, the word follows what you've typed: 1 (or a half-typed
  "1.") → singular, anything else (1.5, 2, junk) → plural. An empty box
  counts as its placeholder, so a blank "1" placeholder says "serving".
  The typed text is read with the existing `parseDecimal()`.
- Unit tests for `unitWord()` and for the box's word (blank, "1", "1.0",
  "1.5", "2", "abc").

## 2. Focus rings only for keyboard users

**Why the × gets a blue ring on a phone.** The ring isn't ours: the ×
has no focus style of its own, so Safari draws its built-in blue one. That
built-in ring already only shows for `:focus-visible`, so swapping in a
`focus-visible:` class alone wouldn't stop it. What actually happens:
1. `BottomSheet` opens with `showModal()`. The browser moves focus into
   the sheet itself, to the first button it finds: the × in the corner.
   (React's `autoFocus` on a box inside can't win: it runs a moment
   *before* the sheet is open, while the box is still hidden.
   `duplicate-dialog.tsx` already notes this.)
2. The browser has to guess whether focus moved by code should show a
   ring. On iPhone a tap never focuses the button you tapped, so Safari
   has no sign that you're using touch, and shows the ring.

**Fix** (`components/bottom-sheet.tsx`, which every sheet uses):
- If the browser put focus on the ×, move it to the sheet's title
  instead. The title gets `tabIndex={-1}` (code can focus it, Tab skips
  it) and no outline. Nothing visible changes. A screen reader starts by
  reading the title ("Add to breakfast"), and the first Tab still lands
  on the ×. A sheet that deliberately focuses something (Skip in the swap
  stack, the Log button on step 2) is left alone.
- The × gets the same matcha ring as every other button, and only for
  `:focus-visible`: `outline-none focus-visible:ring-3
  focus-visible:ring-ring/50`. So a keyboard user sees a matcha ring, not
  Safari's blue.

Not changing: the duplicate dialog starts on Cancel on purpose (so an
accidental Enter can't overwrite a food). A ring there tells you where
Enter goes.

## 3. The Undo message and VoiceOver

**What's reliable on iPhone.**
- "Stay until dismissed **when a screen reader is running**": not
  possible. Web pages can't tell whether VoiceOver is on. Safari doesn't
  share it, on purpose (it would reveal a disability to every website).
- "Stay open **while VoiceOver is on it**": the message already pauses
  while it has focus (`onFocus` in undo-toast.tsx). iPhone VoiceOver
  usually gives real focus to a *button* it lands on, so landing on
  "Undo" pauses the timer. But that's only usually: it isn't documented,
  bug reports say it has changed between iOS versions, and it doesn't
  help you *get there* in time. VoiceOver reads the message out, then you
  have to swipe through the page to find Undo, and 10 seconds is often
  not enough.

**So the reliable answer is: no timer, for everyone.** Proposed:
- The message stays until you tap **×** on it, tap Undo, a newer message
  replaces it, or you leave Today / change day. It never goes by itself.
  This is the one version that works the same with or without VoiceOver,
  because it doesn't depend on detecting anything.
- An × (44 px, "Dismiss") at its right edge, after Undo. After × or Undo,
  focus goes back to the row (as Undo already does).
- Because it can now stay up, Today gets extra room at the bottom while a
  message shows, so the last row (snack's "+ Add") can always be scrolled
  above it. Today the message covers about 2 rem of that.

The cost: a sighted user sees the message until they dismiss it or do
something else. **If you'd rather keep it disappearing**, the fallback is
30 seconds plus the current pause-on-focus. Say which one you want when
you approve.

## 4. Swipe left on a Today entry to delete it, with Undo

**How it feels.**
- Drag a row left and it follows your finger. Behind it, a muted-red strip
  shows a bin icon and "Delete". Let go past about 40% of the row (or
  flick fast) and it slides off, the rows below close the gap, and the
  rings and totals update straight away. Short of that, it springs back.
- Then "Rolled oats deleted from breakfast · Undo", the same message as
  the swap's. Undo puts it back in the same spot.
- Sideways drags only: `dragDirectionLock` and Framer's
  `touch-action: pan-y` (as in the swap stack), so scrolling the day up
  and down still works with your finger on a row. A swipe never also
  counts as a tap that opens the edit sheet.
- **Reduced motion:** the row still follows your finger (that's you
  moving it, the same rule as the swap cards). Let go and it fades out
  instead of sliding off; short of the line it jumps back instead of
  springing.
- Swiping is extra, not the only way. The Delete button in the edit sheet
  stays, for keyboard, VoiceOver and anyone who doesn't swipe, and now
  shows the same Undo message.

**How it works.**
- `components/entry-row.tsx`: the row becomes draggable (same thresholds
  and fly-off as the swap stack). The red strip is hidden from screen
  readers.
- `components/today-view.tsx`: a deleted row is hidden at once ("hidden
  ids"), before the server answers. If the delete fails, the row comes
  back and the message says "Couldn't delete. Please try again." No
  signal: same, and no page reload (the swap's no-signal rule).
- `lib/entry-actions.ts`: `deleteEntry` hands back the row it deleted, so
  Undo knows exactly what to put back. The existing Delete button keeps
  working as before.
- New `restoreEntry(copy)`: inserts the row again with **the same id and
  created_at**, so it returns to the same place in its meal. Like the
  swap's Undo, the copy comes back from your phone, so a new pure
  `validateRestoredEntry()` in `lib/entry-validation.ts` checks it first:
  uuids, day, meal, name length, unit, amount limits, at most one of food
  or recipe, unit matches it (recipe ⇔ serving), every number a real
  number of 0 or more, nutrients and cost may be unknown, water never.
  Row Level Security still only lets you add your own row with your own
  food or recipe. Unit tests for the validator.
- Undo edge cases: tapping Undo twice puts it back once (the second insert
  hits the same id and counts as "already back"). If the food or recipe
  was deleted in between, Undo says "Couldn't put it back: that food was
  deleted." and the Undo button goes.

## 5. Remove the twelve `md:text-base` classes

`components/ui/input.tsx` is now `text-base` (16 px) at every width, so
`md:text-base` ("16 px from tablet width up") repeats what's already
true. Remove all twelve: amount-field (1), barcode-entry (1), food-form
(4), food-picker (1), nutrient-input (1), recipe-form (2), targets-form
(2). Nothing looks different.

---

## Order and commits

0. This plan on its own (`Plan the polish pass`).
1. `Say "1 serving" and "1 item" inside the amount boxes`
2. `Sheets start on their title, so the close button shows no ring on a tap`
3. `Undo stays until you dismiss it`
4. `Swipe left on a Today entry to delete it, with Undo`
5. `Remove twelve md:text-base classes that did nothing`

For each one: build it with Edit/Write → `npm test` → code-reviewer →
fix what we agree to → `npm run build` → commit only the files it changed
(by name). Then `git push -u origin polish` and stop.

## Phone test checklist (after the push)

- Log a recipe: the box says "1 serving", type 2 and it says "servings".
  A food in items: "1 item".
- Open any sheet with a tap: no ring on the ×. With a keyboard (or
  Tab on a laptop): matcha ring on the ×.
- Swap a meal: the message stays until you tap ×. With VoiceOver on: hear
  it, swipe to Undo, double-tap: it works.
- Swipe an entry left halfway and let go: it springs back. All the way:
  gone, totals drop, Undo brings it back in the same spot. Scroll the day
  with your finger on a row, including a quick scroll that drifts a bit
  sideways: it scrolls, nothing is deleted. A slightly wobbly tap still
  opens the edit sheet.
- Edit sheet → Delete → Yes, delete: the sheet closes and the same
  "… deleted from …   Undo  ×" message shows.
- Airplane mode, swipe a row: it comes back at full height with "Couldn't
  delete. Please try again."
- VoiceOver on: double-tap × on the message, and on an entry's Delete in
  the edit sheet. Note where VoiceOver lands (it should be the row, or the
  meal's "+ Add", not the top of the page).
- After tapping Undo or × (no VoiceOver), no ring appears on the row.
- Settings → Accessibility → Reduce Motion on: the swipe fades out
  instead of sliding.
