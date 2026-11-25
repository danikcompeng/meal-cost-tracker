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
| Foods opens on the full Add food form, so the list of your foods starts about 1,100 px down; Recipes has a "New recipe" button instead. "What you paid" comes last, after Brand, More nutrients and Serving | P1 | A change to how the screen works (and the scan flow lands on this form), so it needs its own plan first (CLAUDE.md working rules) |
| No planned / eaten mark on Today's rows, and no "log again" | P2 | Features, not polish |
| "Type the number" and "Enter manually" on the camera screen are hard to tell apart | P2 | Copy change: you asked to keep the copy |
| Straight apostrophes in the app's words ("We'll", "you've"), curly in three places ("doesn’t") | P3 | Touches most of the copy and the tests that read it; one sweep later if you want it |

### After the fixes

- Unit tests: 917 passed (37 files). TypeScript and ESLint: clean.
- End-to-end (Playwright, against the branch on localhost): 5 passed.
- Detector on the changed files: nothing found.
- Checked by script: "Saved", the price preview and the calorie hint
  still appear, and sit in the space that opens for them.
