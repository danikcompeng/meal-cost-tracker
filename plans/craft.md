# Craft pass

Branch `craft`. One commit per group below, and the code-reviewer once
on the whole branch before pushing. Edit/Write only. No migration, no
new features: the app should look the same at a glance and feel more
finished up close.

Approved 2026-11-17 with decisions A–E all the first option. The
preview page lives only as `design/ui/craft/preview-page.tsx.txt`
(text, never built): it's not in `app/`, so it can't be opened on the
live site.

Two techniques are skipped on purpose: OKLCH gradients and
mix-blend-mode (there are no gradients or product photos yet).

## Before screenshots (taken 2026-11-17)

`design/ui/craft/before/`, each 390 × 843 (iPhone width), light and dark:

| Shot | Light | Dark |
| --- | --- | --- |
| Today | `today.png` | `today-dark.png` |
| A swap card (Overnight oats → Egg fried rice) | `swap-card.png` | `swap-card-dark.png` |
| A sheet (Add to dinner → Tuna rice, with the Meal switch) | `sheet.png` | `sheet-dark.png` |

How they were made: a temporary page with made-up meals (no login, none
of your real data), framed at 390 px in Chrome. Its source is parked in
`design/ui/craft/preview-page.tsx.txt`, so the after shots use exactly
the same meals. It's never committed as a page.

What they show that this plan fixes:
- `swap-card-dark.png`: the card and the sheet are the same grey (both
  #1F1F1F). Only a hairline border separates them (technique 8).
- `sheet.png`: the Meal switch's yellow pill has 8 px corners inside a
  10 px track with 4 px padding, so the curves don't run parallel
  (technique 1).
- Small text shows coloured fringes (the blue "$" in "protein per $").
  That's Windows ClearType in the screenshot. The real colour is grey
  (checked: `rgb(97, 97, 97)`), and phones don't do it.

## Technique by technique: where it applies, or why it doesn't

### 1. Concentric radius: applies to 4 places

Rule: when one rounded shape sits inside another, close to its edge,
inner radius = outer radius − the gap. Then the two curves run parallel
instead of pinching at the corners.

It only matters when the gap is smaller than the outer radius. With a
bigger gap, the inner shape doesn't share the corner, so its radius is
free.

| Where | Outer | Gap | Inner now | Inner after |
| --- | --- | --- | --- | --- |
| Meal switch (Add and Edit sheets), unit switch (food form): `segmented-control.tsx` | track 10 px (`rounded-lg`) | 4 px (`p-1`) | 8 px (`rounded-md`) | **6 px** (`rounded-sm`, which is exactly 10 − 4) |
| Recipes / Foods switch: `kitchen-switch.tsx` | 10 px | 4 px | 8 px | **6 px** |
| Undo message's × button: `undo-toast.tsx` | 18 px (`rounded-2xl`) | 4 px (`py-1 pr-1`) | 10 px (Button's `rounded-lg`, shows on hover and press) | **14 px** |
| Log-out message's × button: `log-out-button.tsx` | 10 px | 4 px top, 0 right | circle, touching the right edge | **6 px**, and a 4 px gap on the right too (`pr-1`) |

Already concentric, no change: the switch thumb in its track (a pill in
a pill), the Scan button's circle in its ring, and Today's row over its
red Delete (same shape, gap 0, same radius).

Where you asked about it but it doesn't apply:
- **Swap card chips.** The card's padding is 20 px and its corner 18 px,
  so the gap is bigger than the corner and the chips never share it.
  The chips are pills, shaped by their own text. If they followed the
  card, the result would be 18 − 20 = less than 0, so square chips.
- **Buttons inside sheets.** The sheet's top corners are 18 px, but its
  buttons sit 16 px in and below the title, never in a corner. The
  bottom corners are square, flush with the screen. The × in the
  corner is a round icon button (your app's icon-button shape) whose
  fill only shows on hover. Its gaps aren't even (12 px top, 8 px
  right), so there's no single radius to match.
- **Buttons inside tiles.** Tiles have 16–20 px padding against an
  18 px corner, so the gap is about the same as the corner. Buttons
  keep their 10 px.

Written with `calc()` from the outer token (for example
`rounded-[calc(var(--radius-2xl)-4px)]`), so they follow if `--radius`
ever changes. The rule goes into CLAUDE.md → Design → Layout:

> Nested corners are concentric: when a rounded shape sits within a gap
> smaller than its container's corner, its radius is the container's
> minus the gap (10 px track, 4 px padding → 6 px). With a bigger gap
> the inner radius is free. Pills in pills and circles in rings already
> follow it.

### 2. Alpha borders: applies to every tile edge and divider

`--border` (and `--input`, which outline buttons use as their border in
dark mode) become see-through black or white instead of a fixed grey.
That way a border shows the same amount on whatever it sits on.

| | Now | After | On page | On a tile | On a sheet (dark) |
| --- | --- | --- | --- | --- | --- |
| Light | #E2E2E2 | `oklch(0% 0 0 / 11.5%)` | #E2E2E2 (same) | #D4D4D4 (was #E2E2E2, nearly invisible on #F0F0F0) | n/a (sheet is white) |
| Dark | #2E2E2E | `oklch(100% 0 0 / 11%)` | #2E2E2E (same) | #383838 | #414141 (the solid #2E2E2E would be invisible on the new #2A2A2A sheet) |

`oklch(0% 0 0 / 11.5%)` is the same colour as `rgb(0 0 0 / 0.115)`,
written the OKLCH way so every token in the file uses one notation.

Where you'll see it: the tab bar's top line, sheet and dialog edges,
the swap card and its peeking cards, ingredient chips, the dashed
"+ Add" buttons, the Foods list dividers, the Meal and Kitchen switch
tracks, the Undo message and outline buttons (Skip).

**Input borders keep the solid `--field-border`.** A box's edge has to
be 3:1, and a see-through edge would change contrast with every
surface.

### 3. Colour tokens in OKLCH: applies to all of them, same look

Every token in `app/globals.css` is rewritten in OKLCH. I converted
each one and back: all 29 come back to the exact same hex, so nothing
on screen changes. Examples:

| Token | Hex (unchanged on screen) | OKLCH |
| --- | --- | --- |
| primary, light | #4F6B2E | `oklch(49.09% 0.0938 130)` |
| primary, dark | #93C07F | `oklch(75.93% 0.1016 136.4)` |
| matcha-soft, light | #78855A | `oklch(59.47% 0.0638 122)` |
| destructive, light | #A8432F | `oklch(51.6% 0.1376 33.02)` |
| muted-foreground, light | #616161 | `oklch(49.26% 0 0)` |
| background, dark | #141414 | `oklch(19.13% 0 0)` |

The unused shadcn `--sidebar-*` and `--chart-*` tokens (13 per theme,
nothing reads them) are deleted rather than converted.

**How an accent preset would only change the hue.** Every matcha token
reads one number, `--accent-h`:

```css
:root {
  --accent-h: 130;                                  /* matcha */
  --primary:     oklch(49.09% 0.0938 var(--accent-h));
  --ring:        var(--primary);
  --matcha-soft: oklch(59.47% 0.0638 calc(var(--accent-h) - 8));
}
@media (prefers-color-scheme: dark) {
  :root {
    /* Dark matcha leans 6.4° greener than light. The offset keeps
       today's exact #93C07F and carries over to every preset. */
    --primary:     oklch(75.93% 0.1016 calc(var(--accent-h) + 6.4));
    --matcha-soft: oklch(59.31% 0.0646 calc(var(--accent-h) - 6));
  }
}
/* Later, not in this pass: a preset is one line. */
[data-accent="ocean"] { --accent-h: 240; }
```

Lightness and chroma stay put, so every preset is as light as matcha
and contrast stays almost the same. The camera's accent stays matcha
(the viewfinder is its own world).

**Contrast with only the hue changed**, measured against every surface
it's used on. Text needs 4.5:1, a focus ring 3:1. The ring is the
accent itself, so it's the same number:

| Hue | Light accent | Lowest text / ring (on hover grey) | White on button (on hover) | Dark accent | Lowest text / ring (inside a sheet) | Dark text on button |
| --- | --- | --- | --- | --- | --- | --- |
| matcha 130 (now) | #4F6B2E | 4.93 | 6.04 (4.82) | #93C07F | 6.07 | 8.85 |
| sage 152 | #317045 | 4.87 | 5.96 (4.79) | #76C599 | 6.13 | 8.93 |
| teal 195 | #007171 † | 4.78 | 5.86 (4.80) | #54C4CC | 6.11 | 8.90 |
| ocean 240 | #246790 | 5.02 | 6.15 (4.94) | #7AB7EE | 5.92 | 8.63 |
| indigo 272 | #4E5C96 | 5.18 | 6.34 (5.02) | #A2AAF1 | 5.77 | 8.41 |
| plum 330 | #7E4C7A | 5.35 | 6.56 (5.19) | #DA98C9 | 5.61 | 8.18 |

All pass in both themes. What the numbers say for the presets feature
later:
- † Teal at matcha's chroma is outside what a screen can show (sRGB), so
  the browser clips it. It still passes, but a teal preset should drop
  its chroma a little, so presets may need their own chroma after all.
- Terracotta (45) and ochre (85) also pass, but they're out on meaning:
  red is "over budget" and butter yellow is "where you are".
- Sage is too close to matcha to be worth a slot.

A new test, `lib/color.test.ts` (with the pure helpers in
`lib/color.ts`), checks all of this from `globals.css` itself:
- every token still equals its old hex,
- every text colour is at least 4.5:1 on every surface it's used on
  (the CLAUDE.md pairs), in both themes,
- the ring and field border are at least 3:1,
- the same checks again for each hue in a candidate list.

So the presets feature starts with its safety net already built.

`lib/app-identity.ts` keeps its hex (#FFFFFF, #141414, #4F6B2E). The
status bar and the home-screen icon need fixed colours, and they don't
change.

### 5. Icon stroke matched to the text: applies, as one CSS rule

I measured Figtree's stems in the browser: regular 0.080 of the font
size, medium 0.094, semibold 0.112, bold 0.134. Lucide's lines are 2
units on a 24 grid, so their real thickness depends on the icon's size
(1.33 px at 16 px, 1.67 px at 20, 2 px at 24), not on the text next to
it:

| Icon | Next to | Text stem | Icon line now |
| --- | --- | --- | --- |
| Shuffle on "Tired of this?" | 16 px medium | 1.50 px | 1.33 px, too thin |
| × and ✓ on Skip / Swap | 16 px medium | 1.50 px | 1.67 px, too heavy |
| Chevron on "Show details" | 13 px medium | 1.22 px | 1.33 px |
| Scanner × and torch, side by side | (icon-only) | | 2 px and 1.67 px, not even each other |
| Scan button in the tab bar | "Scan", 13 px medium | | 2 px |

Fix, in `globals.css`: every Lucide icon draws its lines at 0.094 of the
font size it sits in (medium's stem), measured in screen pixels
(`vector-effect: non-scaling-stroke`), whatever the icon's size. So:
- "Tired of this?" and Skip / Swap get 1.5 px,
- "Show details" gets 1.22 px,
- icon-only buttons inherit 16 px, so 1.5 px (the scanner's two
  buttons finally match).

The few icons next to semibold text (the Undo message's ×) get a
`stroke-semibold` class.

Tab bar: Today and Kitchen are words with no icons, so only the Scan
icon changes (2 → 1.5 px, matching the other standalone icons).

### 6. Fade the edges of sideways scrolling: doesn't apply yet

Nothing in the app scrolls sideways. I checked every `overflow-x`,
`snap-x` and `whitespace-nowrap`:
- Chips wrap onto new lines.
- The day is chosen with arrows.
- The swap sheet's `overflow-x-clip` only hides cards as they fly off.

So there's nothing to fade. It'll matter when the Week view's strip of
days arrives (CLAUDE.md, core feature 2). I'll note it in that plan
rather than build an unused utility now.

### 7. Blur-and-fade icon swaps: applies to the torch only

- **Torch** (Flashlight ↔ FlashlightOff, `scanner.tsx`): a real icon
  swap. A small `components/icon-swap.tsx` (Framer's AnimatePresence)
  blurs and fades the old icon out (4 px blur, scale 0.8) while the new
  one comes in, in about 150 ms. With Reduce Motion on it swaps
  instantly. Framer's own reduced-motion setting doesn't cover blur or
  opacity, so the component checks `useReducedMotion()` itself.
  Note: iPhones don't let websites use the torch, so you won't see it
  on yours. I'll show it in Chrome with a faked torch (a local-only
  edit that isn't committed) and record a GIF.
- **Details toggle: doesn't apply.** Its chevron rotates (down ↔ up),
  which is one icon turning, not two icons swapping. Rotation already
  says "this opens and closes". Blurring a chevron into the same
  chevron upside down would only look busy. The same goes for "More
  nutrients". The words "Show details" / "Hide details" stay as they
  are: they change width, and a blur would make that jump more
  noticeable.

### 8. Dark-mode depth: applies, the biggest visible change

Each raised layer is one step lighter (about +4.5% OKLCH lightness),
and nothing in dark mode has a shadow:

| Layer | Now | After |
| --- | --- | --- |
| Page | #141414 | #141414 (same) |
| Tile | #1F1F1F | #1F1F1F (same) |
| Sheet, dialog, Undo message, log-out message (`--popover`) | #1F1F1F, same as a tile | **#2A2A2A** |
| A tile inside a sheet (swap card and its peeking cards, "no swaps" card), hover and chip fills inside a sheet | #1F1F1F / #2A2A2A | **#333333** |

How: a `surface-raised` utility on the sheet and the dialog. In dark
mode it moves `--card`, `--muted`, `--secondary` and `--accent` one step
up, for everything inside. Light mode doesn't change: white sheets
already float over the dimmed page.

Contrast on the new surfaces (dark):

| Surface | Text | Grey labels | Matcha | Red | Box edge (3:1) |
| --- | --- | --- | --- | --- | --- |
| Sheet #2A2A2A | 12.26 | 5.69 | 6.89 | 5.27 | 3.03 → **3.34** |
| In a sheet #333333 | 10.79 | 5.01 | 6.07 | **4.63** | (no boxes there) |

So:
- `--field-border` in dark goes from #737373 to **#7A7A7A**. A box on
  the new sheet would otherwise be 3.03:1, a hair from failing. On the
  page it's 4.29:1.
- The lowest text pair in the app becomes red on a dark in-sheet
  surface, 4.63:1 (it was red on light hover, 4.88). A red button
  (10% red tint) on a dark sheet is 4.51:1, the new lowest tinted
  pair. CLAUDE.md's colour
  table and contrast note get updated with both.

Shadows: only two exist, the switch's thumb and the log-out message.
Both get `dark:shadow-none`. The scanner's dimmed surround is drawn
with a box-shadow, but it's a dim layer, not depth, so it stays.

The swap card's comment ("The border keeps the card visible in dark
mode…") is rewritten: the step does that job now, and the border
stays as a quiet edge.

### 9. vh vs dvh / svh: audited, nothing to change

There's no `vh` anywhere in the app. What's there:

| Place | Uses | Verdict |
| --- | --- | --- |
| Sheets (`bottom-sheet.tsx`) | `max-h-[85dvh]` | Right. A sheet should fit what you can see now. The page behind is locked while it's open, so the toolbar can't change under it. In the installed app all three units are equal anyway. |
| Scanner | `fixed inset-0` | Right. Follows the visible screen, no unit needed. |
| Scan frame | `w-[min(80vw,360px)]` | Fine: width units don't change with the toolbar. |
| Login | `html h-full` + `body min-h-full`, centred | Fine. The page is at most one screen tall and doesn't scroll. |
| Today and the other screens | no viewport units (rem padding for the tab bar) | Nothing to do. |

The one thing a unit can't fix: on an iPhone, the keyboard doesn't
shrink `dvh`. I'll check with the keyboard open that "Servings" and
"Log it" stay visible in the Add sheet on a small phone. That's part of
your phone test, not a code change.

## Commits

1. **Colour tokens in OKLCH, with one accent hue** (3): `globals.css`
   rewritten, unused tokens removed, `lib/color.ts` +
   `lib/color.test.ts`. Committed with this plan and the before
   screenshots. Looks identical.
2. **Dark mode depth** (8): `--popover` step, `surface-raised` on the
   sheet and dialog, `--field-border` dark #7A7A7A, no dark shadows,
   CLAUDE.md colour table.
3. **See-through borders** (2): `--border` and `--input` alpha in both
   themes, CLAUDE.md row.
4. **Concentric corners** (1): the four places above, plus the CLAUDE.md
   rule.
5. **Icon lines as thick as their text** (5): the CSS rule and the
   semibold exceptions.
6. **Torch icon blurs between on and off** (7): `icon-swap.tsx`.
7. **After screenshots**: `design/ui/craft/after/`, same six shots from
   the same preview page, and a "Craft pass" entry in notes.md for your
   case study (what changed, before/after paths).

Then I stop for your phone test.

## Decisions for you (I'd pick the first option each time)

- **A. Dark sheets:** one step lighter, with tiles inside going one
  more step (#2A2A2A / #333333). Or only the sheet lighter, which would
  leave the swap card darker than its sheet, so it looks sunk in.
- **B. Dark box edges:** #737373 → #7A7A7A for margin on the new sheet.
  Or keep #737373 at 3.03:1.
- **C. Icon strokes:** one CSS rule that follows the text size. Or a
  `strokeWidth` prop on each of the 28 icons.
- **D. Details toggle:** keep the rotating chevron. Or blur-swap it
  anyway.
- **E. Preview page source:** commit `design/ui/craft/preview-page.tsx.txt`
  with the screenshots (text, never built), so anyone can see how they
  were made. Or keep it out of Git.

## Not in this plan

- Accent colour presets themselves ("Next feature: make it yours"):
  this pass only makes them a one-line change and proves the contrast.
- Edge fades: nothing scrolls sideways yet (see 6).
- OKLCH gradients, mix-blend-mode: no gradients or photos.

## How to test (after each commit, and all at the end)

- `npm test` (including the new colour test), `npx tsc --noEmit`,
  `npm run lint`.
- Commit 1: before/after pixel check of the six screenshots. They
  should be identical.
- Phone, light and dark:
  - the swap sheet (card stands out from the sheet in dark),
  - the Add and Edit sheets (Meal switch corners),
  - Undo after a delete (× corners on hover/press),
  - Settings and Today borders,
  - "Tired of this?" and Skip / Swap icon weight,
  - Reduce Motion on: nothing new animates.
- Keyboard open in the Add sheet on a small phone (see 9).
