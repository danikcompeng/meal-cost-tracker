# Impeccable pass (2026-11-24)

A refinement, not a redesign: the look, colours, fonts, identity and copy
stay. Branch `impeccable`.

1. `/impeccable document`: there was no DESIGN.md, so one was written from
   the current design (app/globals.css, lib/motion.ts, components/ and the
   Design section of CLAUDE.md), plus its sidecar `.impeccable/design.json`.
   Nothing in the app changed for it. CLAUDE.md stays where design
   decisions are made; DESIGN.md describes them for design tools.
2. `/impeccable audit` and `/impeccable critique` on every main screen at
   phone width (390 x 844, iPhone, 2x), light and dark: Login, Today
   (folded and unfolded), the swap sheet, Add to lunch, Edit entry,
   Kitchen > Recipes, a recipe, Kitchen > Foods, Settings, Scan (camera
   blocked, as in a headless browser) and the 404 page. Before shots were
   taken on production, after shots on the branch running locally.
3. The real findings fixed; the ones that conflict with a recorded
   decision skipped, with the decision named.
4. Everything logged below.

## Reviews

### How the review ran

- **Critique, two reviewers that didn't see each other's work.**
  A: a design review of all 34 screenshots and the code, scored with
  Nielsen's 10 heuristics. B: the Impeccable detector over `app/` and
  `components/`, plus the two public pages (login, 404) at 390 x 844.
- **Audit:** the code checked for accessibility, performance, theming,
  phone layout and design-system drift, with the detector's results.
- **Not covered:** the 404 page when logged out (the app sends you to
  login, so the detector only saw login twice); the real camera (headless
  Chrome has none); a physical phone (still worth a look on the preview).

### Scores (before the fixes)

Critique, design health: **27/40 (Good)**

| # | Heuristic | Score | Main issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | No planned / eaten mark on Today's rows |
| 2 | Match with the real world | 3 | "Type the number" vs "Enter manually" on the camera screen |
| 3 | User control and freedom | 3 | Fine: Undo, close on every sheet, delete asks first |
| 4 | Consistency and standards | 2 | Tile padding, delete icons, protein colour and unit sizes varied |
| 5 | Error prevention | 3 | Fine: confirmations, unit locked in recipes, no fake zeros |
| 6 | Recognition over recall | 3 | The swap on Today is an icon without a word |
| 7 | Flexibility and efficiency | 2 | No "log again"; Foods opens on a full form |
| 8 | Aesthetic and minimalist design | 3 | Empty bands in forms, doubled numbers on the swap card |
| 9 | Error recognition and recovery | 3 | Fine: the camera screen offers three ways on |
| 10 | Help and documentation | 2 | Good inline hints, nothing more |

Audit, technical health: **17/20 (Good)**

| # | Dimension | Score | Main finding |
|---|---|---|---|
| 1 | Accessibility | 4 | Contrast tested for every colour, keyboard-only focus rings, live regions, labels |
| 2 | Performance | 3 | Transform and opacity animations, cheap height collapses; nothing measured as slow |
| 3 | Theming | 3 | Tokens everywhere, but text selection and the text cursor were the browser's own colours |
| 4 | Phone layout | 3 | Foods macro lines wrapped onto a line starting with "·"; kcal column not lined up on Today |
| 5 | Design-system drift | 4 | Detector: 2 findings, both false positives (below). One text glyph used as an icon |

Detector: 2 findings, both `border-accent-on-rounded` in
`components/scan-frame.tsx` (lines 20 and 22). False positives: they are
the scan window's corner brackets (two borders meeting at one rounded
corner, the usual viewfinder shape), not a coloured stripe down one side
of a card. The two public pages scanned clean. After the fixes the
detector finds nothing in the changed files.

What reviewer A called out as working: honest numbers ("—" plus who's
missing it), dark mode's depth by lightness, and every action within
thumb reach.

### Fixed

| # | Finding | Severity | What changed |
|---|---|---|---|
| 1 | Empty hint and status lines kept a blank 20 px line each, so with the stack's gaps a form had 40–60 px empty bands: under "More nutrients" and above "Add food" (Foods), above and below "Save targets" (Settings) | P2 | New `LiveLine` in `components/collapse.tsx`: no room while empty, and the line opens smoothly when it has words, like the red error lines already do. The live region stays on the page so screen readers still hear it. Used for the calorie hint and the "= $0.70 / 100 g" price preview (`food-form.tsx`), the targets hints and "Saved" (`targets-form.tsx`). Checked: all three still appear and are read out |
| 2 | Foods rows: when the macros wrapped, the second line started with "· 0.4 g fat" | P2 | `food-row.tsx`: each item carries its dot in a 16 px slot and the line is pulled 16 px left inside a box that hides the overflow, so the dot of whichever item starts a line is hidden. "per 100 g" now stays on the fat item's line |
| 3 | A recipe screen's left edge zig-zagged: "Cost per serving" and "Ingredients" at 36 px, "Per serving" at 32 px | P2 | `recipe-nutrients.tsx` (and its loading skeleton) `p-4` → `p-5`. Recipe tiles on Kitchen `px-4` → `px-5`, so their names start where Today's meals do |
| 4 | Today: a recipe row's kcal sat 48 px left of its meal's total and of food rows, because of the swap icon | P2 | `meal-section.tsx`, `entry-row.tsx`: when a meal has a recipe in it, food rows keep an empty 48 px where the icon would be and the total moves in by the same, so every kcal in that meal is one column. Meals of foods only (Snack) keep the full width |
| 5 | Foods rows used a typed "✕" character as the delete icon: outside the icon set (its own weight and size), and it reads as "dismiss" | P3 | `food-row.tsx`: Lucide's `Trash2`, the same trash can as Today's swiped-open row, with the line weight of 16 px text. Same "Delete Banana" label and Yes / Cancel |
| 6 | The unit inside the Servings / Amount box was 16 px; every other box's unit is 14 px | P3 | `amount-field.tsx`: `text-sm` |
| 7 | In Add to lunch, food options showed protein in grey; recipes and every other screen show it in matcha | P3 | `food-picker.tsx`: protein in `font-medium text-primary` (not when it's unknown), as `recipe-option.tsx` does |
| 8 | Swap card changes used a hyphen ("-$0.47", "-10 g"), narrower and lower than "+" | P3 | `swap-card.tsx`: a real minus sign (U+2212), so "−$0.47" and "+$0.20" line up, and screen readers say "minus" |
| 9 | Selected text and the blinking cursor in a box used the browser's own colours (blue, black) | P3 | `globals.css`: selection is a quarter-strength matcha wash, the cursor matcha, both from `--primary`, so they follow dark mode and an accent preset |

### Skipped: they conflict with a recorded decision

| Finding | Why skipped |
|---|---|
| Swap card says each change twice ("$0.47 cheaper" chip and "-$0.47" by the price; "-10 g" under protein and "Not a close match: 10 g less protein") | plans/swap.md, "The sheet": the chips, the grey "vs now" change beside the cost and under protein, and the grey "Not a close match" line are all in the approved layout |
| Make "Not a close match" darker and bolder | Same: plans/swap.md says notes are grey lines, never chips |
| Move "1 of 4" into the title row | plans/swap.md puts the counter on its own row with "‹ Back" |
| Reason chips barely show on a light swap card (#E8E8E8 on #F0F0F0) | CLAUDE.md, Colors: "inset" is the colour for chips on a swap card |
| The Kitchen tab opens a page titled "Recipes" | tab-bar.tsx / kitchen-switch.tsx: Kitchen holds Recipes and Foods and opens on Recipes |
| Water shows "0 kcal · 0 g protein" | CLAUDE.md, the 0 kcal rule: 0 is known, not missing, and missing is never hidden |
| Cost is quieter than calories on Today | CLAUDE.md, main screen: rings with one number each, cost under them (plans/rings-and-hydration.md) |
| Log out sits next to Settings in every header | plans/daily-targets.md and plans/demo.md place it there |
| The "Demo account" chip is tight to the top | plans/demo.md places it in the space above the title |
| The 404 page is centred while the camera error is left-aligned | app/not-found.tsx: the 404 deliberately matches the error page (plans/states-a11y.md, commit 4); the camera screen is part of the scanner |
| The gap under the day (Today) and under the Recipes / Foods switch is bigger than between tiles | Not a conflict but not a defect either: it's the 32 px every page leaves between its header and its content (app-header.tsx); the "New recipe" button belongs with the list below it |

### Real, but not a refinement: for you to decide (not done)

| Finding | Severity | Why it waits |
|---|---|---|
| Foods opens on the full Add food form, so the list of your foods starts about 1,100 px down; Recipes has a "New recipe" button instead. "What you paid" comes last, after Brand, More nutrients and Serving | P1 | **Built afterwards, see "Foods: list first" below** (you asked for it to be planned and built without waiting, 2026-11-24) |
| No planned / eaten mark on Today's rows, and no "log again" | P2 | Features, not polish |
| "Type the number" and "Enter manually" on the camera screen are hard to tell apart | P2 | Copy change: you asked to keep the copy |
| Straight apostrophes in the app's words ("We'll", "you've"), curly in three places ("doesn’t") | P3 | Touches most of the copy and the tests that read it; one sweep later if you want it |

### After the fixes

- Unit tests: 917 passed (37 files). TypeScript and ESLint: clean.
- End-to-end (Playwright, against the branch on localhost): 5 passed.
- Detector on the changed files: nothing found.
- Checked by script: "Saved", the price preview and the calorie hint
  still appear, and sit in the space that opens for them.

## Foods: list first (approved 2026-11-24, built the same night)

You asked for the P1 to be planned and built without waiting:
"a 'New food' button like Recipes has (list first, form opens on tap),
and 'What you paid' moved up in the form".

### Plan

- Foods opens on your list, with a full-width matcha **New food** button
  over it (same as New recipe). Tapping it opens the same form in place,
  on its tile: the button folds away as the form slides open, so the
  list doesn't hop. Tapping a food to edit opens it there too, as before.
- **Cancel** closes it; **saving** a new food closes it and the food shows
  in the list. Keyboard or screen-reader focus goes back to New food; a
  tap on an iPhone moves no focus, so no ring appears.
- **No foods yet:** the form starts open, with no Cancel (there's nothing
  behind it).
- "Add it on Foods" (a search with no match in Add to lunch) goes to
  `/foods?new`, which opens on the form.
- **What you paid** moves up to straight after Measured by, before the
  nutrition. The scanner uses the same form, so it gets the same order;
  after a scan the cursor still lands on Price, now higher up.
- The loading skeleton becomes the button and the list.
- Not changed: the form itself (fields, wording, checks), the edit flow,
  the scan flow's steps.

### Code review (code-reviewer agent) and what was done

| # | Finding | Done |
|---|---|---|
| 1a | Focus after closing did the opposite: a keyboard user lost focus to the top of the page (the closing form still held it for its 200 ms), while an iPhone tap got a focus ring on New food | Whether focus was inside the form is noted at the moment it closes; only then does focus go to New food. The closing form is `inert`, so nobody can press Save in it as it folds away |
| 1b | A slow save could close a form you'd opened since (save Rolled oats, tap Banana while it saves: Banana's form vanished) | Each opening of the form is a numbered session; a save only closes the form if it's still its session. Cancel is greyed while saving |
| 1c | `/foods?new` could open with the form shut the second time, because Next keeps a visited page with its state (Cache Components) | When that page is hidden, it's put back to "form open", following Next's own guide (preserving-ui-state.md). Checked: Cancel, go to Today, come back: open |
| 1d | Deleting the food you're editing left "Edit Banana" open, and Save then failed | The form closes when its food leaves the list |
| 1e | Saving emptied the boxes just before the form folded away | Removed: both users of the form leave it after a save |
| 1f | Possible one-frame flash of the old list after adding the first food | Closing after a save is a transition, so it lands with the refreshed list |
| 3b | The list hopped when the form opened (the button vanished and the gap changed at once) | The button folds away while the form opens; the extra 16 px below the form is inside its opening box |
| 3c | The hidden "Add a food" heading was there with the form shut | Only while the form is open |
| 3d | Comments in food-row.tsx still said ✕ | Now "the trash button" |
| 3e | LiveLine's two limits weren't written down | Added to its comment |
| 3f | No test for `/foods?new` or edit then Cancel | Added to e2e/add-food.e2e.ts |
| 3a | Two kept Foods pages (or Foods and Scan) could put two boxes with the same id on the page, so a label might point at the hidden one | **Not done, for later:** the ids (name, price, ...) are written by hand in the form, Field and NutrientInput, and /scan already had the same risk before this change. The fix is `useId()` through all of them, its own small change. Less likely now: plain Foods starts with the form shut |

No security findings. The review also confirmed the earlier commits
(LiveLine, the dots, the kcal column, the small fixes) as correct.

### Tests

- Unit: 917 passed. TypeScript and ESLint: clean.
- End-to-end against the branch on localhost: 7 passed, including the
  new e2e/add-food.e2e.ts (New food, Cancel, Save closes and lists it,
  price before nutrition, edit then Cancel, `/foods?new`).
- By script: keyboard Cancel puts focus on New food; `/foods?new` is open
  again after leaving and coming back; one `#price` on the page.
- Detector: nothing in the changed files.

### Phone check (you, tomorrow morning, on the preview)

1. Kitchen → Foods: your list shows first, under New food.
2. New food: the form slides open, What you paid right under the unit.
   Add a food: the form closes and the food is in the list.
3. New food → Cancel: closes, nothing saved.
4. Tap a food: its form opens at the top; Cancel closes it.
5. Scan a barcode that's in Open Food Facts: the form shows with the
   cursor in Price (now near the top), Save and log works as before.
6. Add to lunch → search for something you don't have → "Add it on
   Foods": opens straight on the form.
7. Settings: no empty band around Save targets; Save shows "Saved".
8. Dark mode: the same screens.
