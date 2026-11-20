# Motion pass

Branch `motion`, made from `main` after `craft` is merged. Edit/Write
only, no migration, no new features: the app does the same things, and
it should feel more physical when you touch it.

Approved 2026-11-18 with decisions A–F all the first option. The
code-reviewer runs once before each of the three phone checks, not per
commit.

Techniques 7 and 8 (theme switch, tooltips) are skipped: the app has no
theme toggle and no tooltips yet.

## Ground rules for every item below

- **Short.** Anything that answers a tap lasts 150–250 ms. Springs are
  written as "about this long, this bouncy" (Framer's `visualDuration` +
  `bounce`), so they can be held to the same 150–250 ms.
- **Cheap.** Only `transform` (move, scale, rotate) and `opacity` are
  animated. These are cheap because the browser can slide or fade an
  already-drawn picture of the element without working out the page
  layout again. `width`, `height`, `left` and `top` force it to redo
  the layout of the page on every frame, which is what makes phones
  stutter. The one exception is the height in item 5 (see there for
  what "the cheap way" means).
- **Reduce Motion.** Each item says what happens when the phone's
  Reduce Motion setting is on (iPhone: Settings → Accessibility →
  Motion). The rule: nothing moves by itself across the screen or
  bounces. Fades stay, and things you move with your own finger still
  follow your finger.
- **Nothing replaces words.** Every red message, `role="alert"` and
  focus move stays exactly as it is. Motion is an extra hint, never the
  only one.

## Motion tokens: one file

`lib/motion.ts`, the shared values, like the colour tokens:

| Token | Value | Used for |
| --- | --- | --- |
| `DURATION.fast` | 0.15 s | press, fades out, the dialog |
| `DURATION.base` | 0.2 s | most things: messages, slides, height |
| `DURATION.slow` | 0.25 s | the shake, the longest allowed |
| `EASE_OUT` | `[0.22, 1, 0.36, 1]` | things arriving: start fast, land softly |
| `EASE_IN` | `[0.4, 0, 1, 1]` | things leaving: start slow, speed away |
| `SCALE_FROM` | 0.97 | where entering things start, and the press |
| `SPRING.snap` | 0.2 s, no bounce | the row opening and shutting |
| `SPRING.settle` | 0.25 s, bounce 0.15 | card back to the middle, anything past a limit springing back |
| `SPRING.sheet` | 0.25 s, no bounce | sheets coming up, the next swap card |
| `SLIDE` | 24 px | how far the day / Recipes / Foods content slides in |
| `RUBBER` | 0.2 | past a limit, it moves 1 px for every 5 px of finger |
| `SHAKE` | 6, 6, 4, 4 px over 0.25 s | one shake, left-right twice, smaller the second time |
| `THROW_SPEED` | 1,500 px/s | the fly-off speed when you tap a button or press an arrow key instead of flicking |

The springs replace the five slightly different springs scattered
across the code today (380/30, 380/32, 420/36, 500/42, 420/30), tuned so
they look the same as now.

CSS can't import a TypeScript file, so the two values CSS needs (the
0.97 scale and the press duration) are also written as variables in
`app/globals.css`, and `lib/motion.test.ts` checks they match, the same
way `lib/color.test.ts` keeps `lib/app-identity.ts` honest. The test
also checks every duration and spring token is between 0.15 and 0.25 s.
CLAUDE.md's Tokens table gets a "Motion" row pointing at the file.

Reduce Motion in one place: today four screens wrap themselves in
`<MotionConfig reducedMotion="user">` and the rest check
`useReducedMotion()` by hand (the offline strip has neither and moves
anyway, only the hand check saves it). One small client wrapper in
`app/layout.tsx` sets it once for the whole app, and the per-screen
copies go. The hand checks stay where Framer can't help: height,
`animate()` calls in gesture code, and the CSS press.

## Item by item: where it applies, or why it doesn't

### 1. Entering at scale 0.97 + opacity 0 (not from 0)

Starting from scale 0 makes things look like they come from a point in
space. Starting at 0.97 means they were always there and just settle
into focus.

| Where | Now | After |
| --- | --- | --- |
| Undo message (`undo-toast.tsx`) | slides up 16 px + fades | **scale 0.97 + fade**, grows from its bottom edge (nearest the tab bar). Leaves the same way, 150 ms |
| Duplicate dialog (`duplicate-dialog.tsx`) | already scale 0.97 + fade, in CSS | **already right**: only its 0.97 and 150 ms move to the tokens |
| Next swap card (`swap-stack.tsx`) | scale 0.95 + 8 px down, no fade | **scale 0.97 + fade**, keeping the 8 px so it still rises from the first peeking card |

Doesn't apply:
- **Bottom sheets** (Add, Edit, Swap, Edit recipe, Add ingredient) and
  the scan result panel. They're fixed to the bottom edge of the screen.
  Scaled, their sides and bottom would pull away from the screen edges
  for a moment, showing a gap. Sliding up from that edge already says
  where they came from. They keep slide + fade, with the shared
  `SPRING.sheet`.
- **List rows** appearing (a new entry, food or recipe) keep their small
  4 px drop-in: a scaled full-width row reads as a zoom.
- **The meal name changing after a swap** keeps its sideways slide: it's
  the "new meal slides into Today's row" moment from CLAUDE.md.

Reduce Motion: fade only, no scale.

### 2. Press feedback: scale to 0.97 while pressed

One CSS rule, `press`, in `globals.css`: while your finger is down
(`:active`) it scales to the token, and lets go in 150 ms. CSS, not
Framer, because it's needed on about 40 elements and CSS costs nothing
until you press. It replaces the Button's current 1 px "push down"
(`active:translate-y-px`).

Applies to:
- **Every `<Button>`** (`components/ui/button.tsx`): Save, Skip, Swap to
  this, Undo, the ×, Start over, and the two links drawn as buttons
  (first use, empty swap stack).
- **Tab bar:** Today, Kitchen and the round Scan button.
- **Switches:** the Recipes | Foods switch and the segmented control
  (Meal, unit) options.
- **Icon buttons:** the day arrows ‹ ›, the sheet's ×, the swap icon on
  a row, the log-out ×.
- **Tappable rows and tiles:** entries on Today, food rows, recipe
  tiles, recipe and food options in the Add sheet, ingredient rows, and
  the dashed "+ Add to breakfast" / "Add ingredient" buttons.

Not on:
- **Disabled, busy or greyed buttons.** Our busy buttons ("Saving…")
  aren't really `disabled` (they use `focusableWhenDisabled` so focus
  stays put, which marks them `aria-disabled` instead), so the rule
  skips all three: `:disabled`, `[aria-disabled="true"]` and
  `[data-unavailable]`. A button that ignores your tap shouldn't look
  like it took it.
- **A row while you swipe it.** On Today the press would otherwise stay
  on for the whole swipe. The moment the swipe locks sideways the row
  gets `data-dragging`, which switches the press off.
- **The red Delete strip** behind a row: it fills the row edge to edge,
  so shrinking it would show slivers of white at the corners.
- **The swap card:** it already follows, tilts and lifts with your
  finger. Pressing it is the start of a drag, not a tap.
- **Plain text links** (Back to today, Set daily targets, Settings):
  shrinking text makes it shimmer. Their colour change is enough.
- **The rings area** (tap to show details) and the **Show water
  switch**: the details unfolding and the switch's knob sliding are
  their feedback; a whole tile or row shrinking under that would be
  two things at once.
- **Boxes you type in.**

To check on a phone: Safari on iPhone only shows `:active` styles if the
page listens for touches. React does, and the current 1 px push already
shows, so it should work, but it's the first thing to try on the phone.

Reduce Motion: no scale. The hover and colour changes stay.

### 3. Shake on error

One shake (left-right twice, 6 px then 4 px, 250 ms) on the box that's
wrong, each time the server says it's wrong, including the same mistake
twice in a row. It moves the box only: the label and the red line below
it stay still, so you can read them.

| Where | What shakes |
| --- | --- |
| Wrong login code (`login-code-form.tsx`) | the code box |
| Invalid amounts after Save: Amount / Servings in the Add and Edit sheets, an ingredient's amount, a recipe's servings, price and package size, targets | the red boxes (with Amount, its "g" moves with it) |
| Failed save (no connection, server down: the red line under the form) | the button you pressed (Save, Log in, Add) |

How: Today, after a save comes back with red boxes,
`use-focus-first-invalid.ts` already moves focus to the first one, once
per answer. That same moment also shakes them, so every form gets it
from one place. The login code form gets the same call. The shake uses
the browser's own `element.animate()`: no React state, nothing redraws.

Doesn't apply:
- **A failed swap:** the card already slides back from the side it
  left by. That says "didn't work" better than a shake.
- **A failed delete or Undo:** the row comes back or the message turns
  red and stays. Those aren't boxes you typed in.

Reduce Motion: no shake. The red box, the red line, its `role="alert"`
and the focus move do the job, as they do today.

### 4. Directional slides

The new content slides in 24 px from the side you moved towards and
fades in, 200 ms. Only the arrival animates, never the leaving: the old
day comes from the server, and holding it on screen for a leaving
animation would only delay the new one.

**Previous / next day (Today):**
- ‹ Previous day: the day arrives from the left, like turning back a
  page. › Next day and "Back to today": from the right.
- What slides: the title ("Yesterday"), the date line and everything
  under it. The ‹ › arrows stay put, so tapping one three times in a
  row hits the same spot each time.
- How it knows the direction: a small client component remembers the
  last day it showed and compares. Browser back and forward work too.
  A fresh page load or reload doesn't slide.
- To check while building: whether Next shows the grey skeleton between
  days. If it does, the slide plays once, on whatever appears first,
  not again when the food loads in.

**Recipes | Foods:**
- Foods is on the right, so going to Foods it arrives from the right;
  back to Recipes, from the left.
- What slides: the list under the switch. The page title and the switch
  stay put.
- They're two separate pages (`/recipes`, `/foods`), so the switch's
  link leaves a one-time note saying which way you went, and the next
  page reads it. Opening Kitchen from the tab bar, a reload, or the
  browser's back button doesn't slide.

Reduce Motion: a plain fade, no sideways move.

### 5. Smooth height

What "the cheap way" means here: one wrapper with `overflow: hidden`
animates its height. What's inside is laid out once at its final size,
so text doesn't re-wrap on every frame; it's just uncovered. No other
element's size is animated, it lasts 200 ms, and nothing else animates
at the same time inside it. Two shared pieces do all of it:

- `<Collapse open>`: opens to its content's height and closes to 0,
  with a fade.
- `<AutoHeight>`: follows its content's height as it changes.

| Where | Now | After |
| --- | --- | --- |
| Show / Hide details under the rings (`day-summary.tsx`) | already animates height this way | moves into `<Collapse>`, values from the tokens |
| Error lines appearing (about 14 forms) | pop in, pushing everything below down at once | a shared `<ErrorLine>` in a `<Collapse>`: the space opens and the line fades in. Each new answer is a new line, so the same error twice is still read out again |
| The Add sheet between steps (pick a food → amount → back) | the sheet's top edge jumps | `<AutoHeight>` in `bottom-sheet.tsx`: the top edge glides to the new height while the new step fades in (150 ms) |

The sheet's height only animates when the step changes. Typing, error
lines (they animate themselves) and the keyboard opening don't set it
off, so two height animations never fight. Because it's in the shared
sheet, the Swap sheet gets it too: a card with more ingredient chips
than the last no longer makes the sheet jump.

Two height animations already exist and move into `<Collapse>` so the
audit (item 6) has no surprises: **More nutrients** (food form) and the
**offline strip**.

Reduce Motion: heights change at once, no animation (as the details
toggle does today). Framer's own Reduce Motion setting doesn't cover
height, so `<Collapse>` and `<AutoHeight>` check it themselves.

### 6. Audit: transform and opacity only

Every animation in the app today, and what happens to it:

| Where | Animates | Verdict |
| --- | --- | --- |
| Sheets, scan result, scan screen | move + fade | fine |
| Undo message | move + fade | fine (becomes scale + fade, item 1) |
| Swap card | move, tilt, scale, fade; labels fade | fine |
| Today row | move (swipe, slide-off), Delete fade, name slide | fine |
| List rows, all four lists | `layout` (moves rows with transform) + fade | fine |
| List rows leaving (Today, foods, recipes, ingredients) | **height to 0**, so the rows below close up | **breaks the rule**: decision B |
| Details, More nutrients, offline strip | **height** | allowed as item 5, via `<Collapse>` |
| Details and More nutrients chevrons | rotate | fine |
| Torch icon (craft technique 7) | scale + fade + blur | blur isn't layout (it only re-paints a 20 px icon for 150 ms); kept, as approved in the craft pass |
| Progress rings | line length (SVG `pathLength`) | not layout, only paints the ring, but **800 ms**: decision C |
| Scan window breathing | fade, 2 s, repeating | an ambient loop, not an answer to a tap; already off with Reduce Motion. Kept |
| Camera picture appearing | fade, **300 ms** | down to `DURATION.slow` (250 ms) |
| Skeletons | fade pulse, repeating | kept, already off with Reduce Motion |
| **Every `<Button>`** | `transition-all` | **risky**: it would animate any property that ever changes, a width included. Becomes an explicit list: colours and scale |
| Hover colours (`transition-colors`) | colour | fine: colour re-paints but never moves the layout |

### 9. Velocity: the finger's speed carries into the spring

What happens today (found while planning, in Framer's code):
- **Delete row:** when you let go, Framer starts its own little
  animation with no speed *first*, then tells our code you let go. So
  by the time our snap spring starts, the speed is already 0: a fast
  flick opens the row at the same pace as a slow push.
- **Swap card:** the fly-off is a fixed 220 ms that starts slow and
  speeds up. A hard flick visibly slows down when you let go, then
  speeds up again.

After:
- **Row:** the snap spring starts at the finger's speed, which Framer
  reports with the "let go" (`velocity.x`). A quick flick shoots open
  and settles; a slow push eases in. When the page then confirms the
  row is open, the spring already heading there isn't restarted (a
  restart would measure the speed again and lose it).
- **Card fly-off:** a spring that starts at the finger's speed, at least
  `THROW_SPEED` so a tap on Swap / Skip or an arrow key still sends it
  off briskly. The card counts as gone the moment it's fully off the
  screen edge, not when the spring finally comes to rest, so the next
  card isn't kept waiting.
- **Card "never mind":** let go short of the line and it springs back to
  the middle carrying your speed, so it doesn't stall.
- The tilt is worked out from the card's position, so it follows by
  itself.
- Found while recording the before clips: under `next dev` (not in a
  production build, not on the live site) the card after a Skip stays
  off-screen at −480 px, so the stack looks empty. Dev runs React's
  double-checking mode, so it's probably the fly-off's "then" and the
  "new card back to the middle" step running in the wrong order there.
  The new fly-off replaces that code, and is checked under `next dev`
  too.
- A pure function in `lib/swipe.ts`, unit tested: given the release
  speed and the direction, the throw speed. At least the minimum, always
  pointing the way the card is going (a flick back towards the middle
  just before letting go never makes it fly the wrong way).

Reduce Motion: unchanged from today. There's no fly-off (the next card
fades in) and the row jumps open or shut.

### 10. Rubber banding

Past a limit, the thing still follows your finger but slower, as if on
a rubber band, and springs back when you let go, carrying your speed
(item 9).

| Where | Now | After |
| --- | --- | --- |
| Shut row pulled right | hard stop: it doesn't move at all | stretches at `RUBBER` (1 px per 5 px), springs back |
| Open row pulled further left, past Delete | stretches a little (0.1) | `RUBBER`, the same feel as the right side |
| Swap card pulled up or down | can't move up or down at all (left-right only) | stretches at `RUBBER`, springs back, doesn't tilt |

The swap card has a catch. Today an up/down drag on the card scrolls the
sheet (on a small phone the swap sheet can be taller than the screen).
If the card also moved up and down, the browser would have to stop
scrolling the sheet whenever your finger is on it. So the card only
stretches up and down **when the sheet fits on screen and has nothing to
scroll**. When it does scroll, up/down keeps scrolling it, as now (and
iPhone already rubber-bands the sheet itself at its ends). With a mouse
it always stretches.

Framer's rubber band is a straight line: always 1 px per 5 px. iPhone's
own gets stiffer the further you pull. For a pull of a few dozen pixels
they feel the same; getting the curve would mean replacing Framer's
drag with our own gesture code and redoing the "is this a swipe or a
scroll?" fixes. Not in this pass.

Reduce Motion: it still stretches under your finger (you're moving it
yourself), and goes back at once instead of springing.

## Before / after recordings for the case study

Saved in `design/ui/motion/before/` and `design/ui/motion/after/`, at
iPhone width (390 px), light mode:

| Clip | Shows |
| --- | --- |
| `swap.gif` | open the swap stack, flick a card left (Skip), flick the next right (Swap), the new meal slides into the row |
| `delete.gif` | flick a row open, pull it past Delete, tap Delete, the Undo message appears |
| `rubber-band.gif` (after only, plus a before for the hard stop) | pull a shut row right, pull the card up |

How:
- The **before** clips are made first on the `motion` branch, before any
  code changes. The **after** clips at the very end.
- Recorded in Chrome with its GIF recorder. The gestures are scripted
  (same start, distance and speed both times), so before and after
  differ only in the motion. Fair for a comparison, and repeatable.
- On your own account (decision D changed to its second option on
  2026-11-18: Supabase's login email failed with a 500 for the new demo
  address). You log in yourself on `localhost:3000`. Your real meals
  show in the clips. Anything a clip changes (a swap, a delete) is put
  back with Undo straight away.
- Kept for later: `design/ui/motion/seed-demo.sql`, made-up meals for a
  demo account, run in Supabase's SQL Editor after pasting in that
  account's user id. It only ever writes rows for that one id, refuses
  to run on an account that already has foods, and holds no keys: the
  SQL Editor is already logged in as you. Not run yet.
- If the GIF recorder's frame rate turns out too low to show a spring
  (it captures frames, it isn't a video), I'll tell you, and give you a
  shot list to record on your iPhone instead (Control Centre → Screen
  Recording). Real fingers on a real phone are the better video for a
  case study anyway; the scripted ones are the fair side-by-side.
- GIFs are big. Committed if each is under 2 MB, otherwise kept out of
  Git and I'll say where they are.

How they were actually made (2026-11-18): the GIF recorder only takes a
frame per action, too few for a 200 ms spring. Instead the page's clock
is slowed (4× for the swap, 6× for the delete) while the scripted gesture
plays, screenshots are taken in a burst, and `make_gif.py` plays them back
at real speed. Against a production build (`next start`), dark mode, your
Monday Nov 16; everything put back with Undo. Steps and the exact
gestures: `design/ui/motion/recorder.js.txt`. The before clips: swap
21 frames, 188 KB; delete 31 frames, 94 KB (it starts with pulling the
shut row right, which today doesn't move at all).

## Commits

One per group, each with its tests passing:

1. Plan and before recordings
2. Motion tokens: `lib/motion.ts`, CSS variables, `lib/motion.test.ts`,
   Reduce Motion set once in the layout, the springs moved onto the
   tokens (should look the same as before)
3. Entering at 0.97 (item 1)
4. Press feedback (item 2)
5. Shake on error (item 3)
6. Directional slides (item 4)
7. Smooth height: `<Collapse>`, `<ErrorLine>`, `<AutoHeight>` (item 5)
8. Audit fixes (item 6)
9. Velocity (item 9)
10. Rubber banding (item 10)
11. After recordings, a motion entry in notes.md, CLAUDE.md's Tokens row

I'll stop for you to try it on your phone three times: after 4 (how
things appear and press), after 8 (shake, slides, heights), and after
10 (the gestures: these are about feel, and only a real finger can
judge them). Then the code-reviewer once on the whole branch.

## Phone check 1 (2026-11-20): what changed

- **Press:** full-width buttons (Save, Log it, Delete, Tired of this?…)
  shrink to 0.985 like rows (`press-wide`, which `cn` swaps for the
  Button's own `press`). Small buttons, and the two half-width ones side
  by side (Skip | Swap), keep 0.97.
- **Undo message:** settles in over `SETTLE_DURATION` (0.4 s), a second
  named exception after the ring fill. Leaving stays 150 ms.
- **Delete:** like iPhone Mail. After Delete the row keeps sliding left
  off the screen (`DURATION.slow`), with red glued to its right edge
  filling the space it leaves; only then does the red close up
  (`DURATION.base`), so the rows below move up. Deleted from the edit
  sheet there's no slide, so it closes at once. The last entry of a meal
  now plays it too (the list stays on the page while it leaves).
  Reduce Motion: a fade, then the rows below jump up.
- **Rings:** fill from empty once per visit, the first time Today shows
  them after the app is opened or reloaded; later in the same visit
  (back from Kitchen) they appear at their value. The server already drew
  them empty and they filled on load; what was missing was "once".
  An iPhone app brought back from the background isn't a new visit (the
  page never reloaded), so it doesn't fill again.
- **Swap on Today:** the old meal (name, amount, kcal) slides out to the
  left and the new one in from the right as one strip
  (`components/meal-push.tsx`), no fade. The first version moved them as
  two separate animations and measured a 40–50 px gap between them
  mid-slide; as one strip it's 0 px on every frame. Undo plays it too.
  Reduce Motion: the new meal fades in.

## Decisions for you (I'd pick the first option each time)

- **A. Press on wide rows:** rows and tiles scale to 0.985, buttons to
  0.97. A row is about four times wider than a button, so 0.97 moves its
  edges about 5 px each side; 0.985 gives the same visible "give" as
  0.97 on a button. Or 0.97 everywhere, exactly as written.
- **B. Rows leaving a list:** keep the height closing up as a second
  "cheap" height animation (one row, 200 ms, overflow hidden). Or
  transform only: the leaving row is lifted out and everything below
  moves up with `layout`, which means marking every meal section and
  button below it too, and measuring them all on each delete. More code,
  more work for the phone, for the same look.
- **C. Progress rings filling (800 ms):** keep it as the one named
  exception, as a token `DURATION.fill`. It isn't an answer to a tap,
  it's the day's numbers being drawn, and at 250 ms the fill is over
  before you've looked at it. Or bring it down to 250 ms.
- **D. Made-up meals for the recordings:** a demo login (a second email
  of yours) with the craft preview's made-up meals entered through the
  app. The craft preview page can't be used: it has no login, so a swap
  or delete can't save and the card would come back. Or your own
  account, real meals included.
- **E. What shakes on a failed save:** the button you pressed. Or the
  red line under the form.
- **F. Shake every red box after Save,** names included (one rule from
  one place). Or only number boxes (amounts, servings, prices,
  targets), as written in the request.

## Not in this plan

- Theme switch and tooltip tricks: nothing to animate yet.
- Sheets closing: they disappear at once today. Animating it is a
  different change (a `<dialog>` closing is removed by React before it
  could play anything); worth its own small plan.
- The yellow pill sliding from Recipes to Foods: each page draws its own
  switch, so the pill can't travel between them without restructuring
  the two pages into one layout.
- Swiping sideways on Today to change day.
- iPhone's curved rubber band (see item 10).

## How to test (after each commit, and all at the end)

- `npm test` (tokens match the CSS, every duration 150–250 ms except
  the ring fill, throw speed), `npm run lint`, `npm run build`.
- On your phone, each item twice: Reduce Motion off, then on.
- Press: a busy Save ("Saving…") doesn't shrink; a swiped row doesn't
  stay shrunk.
- Shake: the same wrong code twice shakes twice; VoiceOver still reads
  the error out both times.
- Error lines: VoiceOver reads a new error as soon as it appears.
- Slides: ‹ three times fast lands three days back with the arrows
  never moving; reload doesn't slide; browser back slides the right way.
- Add sheet: pick a food, go back, pick another, with the keyboard up.
- Velocity: a fast flick and a slow push on a row look different; a
  flicked card doesn't slow down as you let go.
- Rubber band: on a small phone (or 320 px wide) where the swap sheet
  scrolls, up/down on the card still scrolls it.
- 320 px wide: nothing scaled or slid causes a sideways scrollbar.
