---
name: Bitewise
description: Cheap meals that hit your macros, on repeat, with a swap when you're bored.
colors:
  paper: "oklch(100% 0 0)"
  ink: "oklch(20.46% 0 0)"
  tile: "oklch(95.51% 0 0)"
  inset: "oklch(93.1% 0 0)"
  popover: "oklch(100% 0 0)"
  label-grey: "oklch(49.26% 0 0)"
  hairline: "oklch(0% 0 0 / 11.5%)"
  field-edge: "oklch(61.67% 0 0)"
  matcha: "oklch(49.09% 0.0938 130)"
  on-matcha: "oklch(100% 0 0)"
  matcha-soft: "oklch(59.47% 0.0638 122)"
  butter: "oklch(84.96% 0.1463 90.49)"
  tomato: "oklch(51.6% 0.1376 33.02)"
  swipe-pick: "oklch(92% 0.06 130 / 70%)"
  swipe-skip: "oklch(20.46% 0 0 / 6%)"
  night-page: "oklch(19.13% 0 0)"
  night-tile: "oklch(23.93% 0 0)"
  night-popover: "oklch(28.5% 0 0)"
  night-raised: "oklch(32.11% 0 0)"
  night-ink: "oklch(94.61% 0 0)"
  night-label-grey: "oklch(71.55% 0 0)"
  night-matcha: "oklch(75.93% 0.1016 136.4)"
  night-tomato: "oklch(70.72% 0.1178 33.15)"
  night-butter: "oklch(82.83% 0.1297 88.7)"
typography:
  key-number:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
  page-title:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.25
  card-name:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
  sheet-title:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  secondary:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
rounded:
  bar: "4px"
  md: "8px"
  lg: "10px"
  2xl: "18px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  tap: "44px"
components:
  button-primary:
    backgroundColor: "{colors.matcha}"
    textColor: "{colors.on-matcha}"
    rounded: "{rounded.lg}"
    height: "44px"
    typography: "{typography.body}"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "44px"
  tile:
    backgroundColor: "{colors.tile}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "44px"
  chip:
    backgroundColor: "{colors.inset}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    typography: "{typography.label}"
  tab-active:
    backgroundColor: "{colors.butter}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    height: "44px"
  sheet:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
---

# Design System: Bitewise

<!-- Written by /impeccable document on 2026-11-24 from app/globals.css,
     lib/motion.ts, components/ and the Design section of CLAUDE.md. It
     documents the design as it is; CLAUDE.md stays the place decisions
     are made, and lib/color.test.ts stays the check on every colour. -->

## Overview

**Creative North Star: "The Recipe Card"**

Black ink on white paper with one matcha-green accent, like a tidy recipe
card pinned inside a kitchen cupboard, not a finance dashboard. Every
screen is a stack of soft grey tiles on a white page, each holding one
thing: today's rings, one meal, a recipe's cost, its ingredients. The
voice is calm and plain; numbers carry the screen, and each screen has
exactly one big one.

Density is phone-first and generous: one column, 16 px gutters, 44 px tap
targets, nothing hidden behind hover. Colour is rationed: matcha marks
actions and the number that matters (protein, cost per serving), butter
yellow only says "you are here", muted tomato only says "over". Dark mode
is a real second design (near-black, depth by lightness), not an
inversion.

Motion is quiet everywhere except one place: the "I'm tired of this" swap,
a flat card stack you swipe sideways. That moment is allowed to delight;
everything else just fills, fades or slides 24 px.

**Key Characteristics:**
- One font (Figtree), tabular numbers everywhere.
- One accent (matcha, hue 130 read from `--accent-h`), one highlight (butter), one warning (tomato).
- Flat tiles on paper; depth by tone, never shadow.
- Concentric corners: nested radii are the outer radius minus the gap.
- Missing stays missing: "—" and "+ 1 food without protein", never a quiet 0.

## Colors

A neutral grey ladder with a single green voice, written in OKLCH so an
accent preset changes one hue number and keeps every contrast.

### Primary
- **Matcha** (light #4F6B2E, dark #93C07F): actions, the key number on a screen, protein figures, links. White text on it in light mode, near-black in dark.
- **Soft Matcha** (#78855A / #76855A): non-text fills only, the ring arcs and the budget bar. Never text, never the only carrier of information.

### Secondary
- **Butter** (#F2C94C / #E9C25A): the active tab and the selected option of a segmented control. Dark ink on it. Nothing else.

### Tertiary
- **Muted Tomato** (#A8432F / #E08470): over budget, destructive actions, errors.

### Neutral
- **Paper** (#FFFFFF / #141414): the page.
- **Tile** (#F0F0F0 / #1F1F1F): every section sits on one.
- **Inset** (#E8E8E8 / page colour in dark): one step in from a tile: chips on a swap card, ring tracks, skeleton bars.
- **Popover** (#FFFFFF / #2A2A2A): sheets, dialogs, menus, the Undo message; bordered so a white sheet shows on white.
- **Raised** (dark only, #333333): tiles and chips inside a popover (`surface-raised`).
- **Ink** (#171717 / #EDEDED) and **Label Grey** (#616161 / #A3A3A3): text.
- **Hairline** (black 11.5% / white 11%): see-through borders and dividers, same weight on any surface.
- **Field Edge** (#858585 / #7A7A7A): only the edge of a box you type in (3:1).
- **Swipe Pick / Swipe Skip**: the see-through tint under a swap card's text while dragged right / left.

### Named Rules
**The One Voice Rule.** Matcha is the only accent. If something needs attention and isn't an action or the key number, it gets weight or size, not a colour.

**The Butter Means Here Rule.** Butter marks where you are (active tab, chosen option) and nothing else. Warnings are tomato.

**The Measured Contrast Rule.** Every text colour passes 4.5:1 on every surface it can land on, checked by lib/color.test.ts. Unavailable buttons are greyed with colour, never faded with opacity.

## Typography

**Display Font:** Figtree (with system-ui, sans-serif)
**Body Font:** Figtree
**Label/Mono Font:** none; labels are Figtree medium at 13 px.

**Character:** One friendly geometric sans with real tabular figures:
modern enough for a fitness app, soft enough for a kitchen.

### Hierarchy
- **Key number** (700, 48 px, line-height 1, tabular): the ONE most important number per screen: kcal left on Today, cost per serving on a recipe and a swap card. 36 px when a ring number reaches six digits.
- **Page title** (700, 30 px, leading-tight): Today, Recipes, Foods, Settings, a recipe's name.
- **Card name** (700, 24 px): the recipe name on a swap card.
- **Sheet title** (500, 18 px): sheets and dialogs.
- **Body** (400–500, 16 px): rows, inputs (16 px also stops iPhones zooming), buttons in forms.
- **Secondary** (400, 14 px): sub-lines, hints, small buttons.
- **Label** (500, 13 px, grey): the small label above a number or a section.

### Named Rules
**The One Big Number Rule.** Bold is for page titles and the single key number. Everything else is regular or medium.

**The Tabular Rule.** Every number uses `tabular-nums`, including the big one and every price in a list.

## Layout

One column, mobile-first, max-w-lg centred on wider screens. Page gutter
16 px (`px-4`); tiles pad 16–20 px; sections stack with 12–16 px between
tiles. Tap targets are 44 px (`h-11`) or 48 px. A fixed bottom tab bar
(Today · Scan · Kitchen) with the round matcha Scan button rising above it;
every tab screen pads its bottom with `pb-above-tab-bar` (7 rem plus the
home-bar inset) so the last row scrolls clear. Sheets rise from the bottom,
at most 85dvh tall. Spacing is Tailwind's 4 px grid: 1 2 3 4 5 6 8, half
steps only for tight chips and rows.

## Elevation & Depth

Flat. No shadows anywhere. Depth is tone: in light mode the white page
holds grey tiles, with insets one step darker inside them, and a white
sheet floats back on top over a 40% black scrim. Dark mode climbs instead:
page #141414 → tile #1F1F1F → popover #2A2A2A → raised #333333, each one
step lighter.

### Named Rules
**The Tone Not Shadow Rule.** A layer shows it's above another by being one lightness step away, never by a drop shadow.

## Shapes

Soft and consistent. Tiles, sheets and swap cards are 18 px
(`rounded-2xl`); buttons, inputs and rows 10 px (`rounded-lg`, the
`--radius` token); text links 8 px; chips, pills, tabs and rings fully
round; plain 4 px only on skeleton text bars. Borders are hairlines.
Dashed hairline boxes mean "empty slot, tap to add" ("Add to dinner",
"Add ingredient").

### Named Rules
**The Concentric Rule.** A rounded shape closer to its container's edge than the container's radius gets the container's radius minus the gap, border included, written from the outer token: `rounded-[calc(var(--radius-lg)-5px)]`.

## Components

### Buttons
- **Shape:** gently rounded (10 px), 44 px tall in forms and sheets.
- **Primary:** matcha fill, white text (near-black in dark); hover at 90% matcha (4.8:1).
- **Outline:** paper fill with a hairline edge; Skip on the swap sheet, Try the demo.
- **Destructive:** a 10% tomato tint with tomato text; hover underlines rather than darkening.
- **States:** pressed shrinks to 0.97 (0.985 for full-width), 150 ms; busy keeps full colour and changes its words ("Saving…"); unavailable is grey on grey (5.4:1). Focus is a solid 2 px matcha outline, 2 px out, keyboard only.

### Chips
- **Style:** fully round, 13 px. On a swap card: inset grey fill for reasons ("$0.47 cheaper", matcha text) and hairline outline for ingredients.
- **State:** information only; chips are never buttons.

### Cards / Containers
- **Corner Style:** 18 px.
- **Background:** tile grey; raised grey inside a dark sheet.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** none on tiles; hairline on sheets, outline buttons and the segmented control.
- **Internal Padding:** 16 px (meal sections 8 px with 12 px rows inside).

### Inputs / Fields
- **Style:** white box (page colour in dark), 1 px field-edge border (3:1), 10 px radius, 44 px tall, 16 px text, unit suffix in grey inside the right edge.
- **Focus:** the matcha focus outline.
- **Error:** tomato border and a message under the field that screen readers hear.

### Navigation
- **Tab bar:** fixed bottom, paper background with a hairline top edge. Today and Kitchen are 16 px medium grey text; the active one sits in a butter pill. Scan is a round matcha button in the middle with its label under it.
- **Segmented control:** a hairline track with a 4 px inset; the chosen option is a butter pill with a concentric corner. Recipes | Foods, and g | ml | each.
- **Header:** page title left, small grey text links (Settings, Log out) right; back links are a chevron plus the parent's name.

### The Swap Stack (signature)
The "I'm tired of this" sheet shows your other recipes as a flat card
stack, best match first: reason chips, name, cost per serving as the key
number, protein / kcal / protein per $, ingredient chips, "Last had".
Drag right to swap, left to skip; the card tints under its text (swipe
pick / swipe skip) and a solid sign (check + "Swap" or ✕ + "Skip") fades
in, popping once when letting go would count. Cards move only sideways:
no tilt, no lift. Swapping closes the sheet and the meal row on Today
slides like a carousel (old out left at 0.9 scale, new in from the right).
Reduce Motion: crossfades.

## Do's and Don'ts

### Do:
- **Do** use the colour tokens as classes (`bg-card`, `text-muted-foreground`, `border-field-border`); hex only in lib/app-identity.ts.
- **Do** keep exactly one 48 px bold number per screen, with a 13 px grey label above it.
- **Do** put every section on a tile, and boxes you type in straight on the tile or sheet, white.
- **Do** write a nested radius from its outer token (the Concentric Rule).
- **Do** take motion values from lib/motion.ts (150 / 200 / 250 ms, EASE_OUT, SPRING) and give every animation a Reduce Motion version.
- **Do** design the empty, loading, error and first-use state of every screen.

### Don't:
- **Don't** add shadows, gradients, glass or purple; depth is tone.
- **Don't** use emoji as icons; icons are Lucide, with strokes matched to the text (0.094em).
- **Don't** use matcha-soft for text or as the only sign of something.
- **Don't** put an input or a red button on a tile inside a dark sheet (2.9:1 and 3.99:1); put them straight on the sheet.
- **Don't** show 0 or a lower total that quietly leaves an unknown out.
- **Don't** tilt, lift or rotate the swap cards.
