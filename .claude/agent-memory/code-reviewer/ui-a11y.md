---
name: ui-a11y
description: Verified CSS/Tailwind v4, Base UI, focus, screen-reader and iPhone facts for Meal Cost Tracker reviews (button states, focus rings, heights, safe areas, contrast)
metadata:
  type: reference
---

Buttons and Tailwind
- Busy = disabled + focusableWhenDisabled (full colour); can't-use-now = also
  `data-unavailable={x || undefined}` (bg-muted grey). New confirm/second buttons need
  data-unavailable while the OTHER action runs. React renders data-x={false} as "false" (matches).
- TW v4 variant order: hover < disabled < aria < data < custom (dark); numeric sort: h-11 beats h-7.
- Base UI focusableWhenDisabled: aria-disabled, onClick preventDefault (blocks click AND Enter
  submit), keydown preventDefault on every key but Tab (also stops Esc closing a dialog).
  Plain `disabled` = native: a focused button drops focus to <body>.
- `cn` = shadcn "cn" package, tailwind-merge parity: later conflicting class REPLACES earlier;
  unknown classes (focus-ring, surface-raised, press) pass through.
- Input font: every text field >= 16 px at ALL widths (iOS zoom; iPad = md). ui/input.tsx text-base.

Focus
- focus-ring / focus-ring-inset / focus-ring-within @utility (solid 2 px var(--ring)). New
  buttons/links need one. Dark matcha ring on butter = 1.22:1 (never inset on a highlight);
  ring-ring/50 on bg-destructive ~1.1:1. Opacity on an element fades its outline too.
- iPhone: a tap never focuses a button, so ANY later script .focus() draws a ring.
  BottomSheet: React autoFocus / child effect focus at open is a no-op (dialog still shut);
  showModal picks first focusable incl. tabIndex -1 (title) or an HTML autofocus attr.
- Hiding/unmounting the focused control drops focus to <body>.

Screen readers
- Validation failures return fieldErrors only: nothing announced unless focus moves or an alert.
  role=alert present in first HTML is usually not read. Same text after a retry = not re-announced
  (hide while pending). aria-busy="true" on a live region holds its announcements.

Colours (craft pass 2026-11-17)
- Dark depth page #141414 < card #1F1F1F < popover #2A2A2A < raised #333. Every bg-popover needs
  surface-raised (works only because @theme is `inline`). On raised: field-border 2.94:1, red tint
  3.99:1 (keep inputs/red buttons off tiles in sheets). Presets must be :root[data-accent].
  Tailwind scans .md files too. Button base text-sm: icon strokes 1.32 px.

Layout maths
- Body 16/1.5: text-[13px] lh 19.5; text-sm 20; text-xl 28; Field = 14+6+44 = 64. AppHeader row ~46.
- viewport-fit=cover: new FULL-WIDTH fixed/absolute elements need safe-area-inset-left/right.
  Tab bar ~68.5 px, Scan ring top 91.5 px: toast 6rem and pb-above-tab-bar 7rem depend on it.
- Email template: card content = viewport - 98 px; Outlook desktop no font inheritance in nested
  tables. App code text should match the email's wording/order.
