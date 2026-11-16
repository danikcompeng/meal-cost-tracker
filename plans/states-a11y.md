# States and accessibility

Branch `states`. One commit per group below, each reviewed by the
code-reviewer before it's committed. Commit 1 is done (c035d9b).

Every screen should handle being empty, loading, failed and offline,
and work with a keyboard, a screen reader and big fingers.

## Commit 1: login email shows the code first (done)

Why: in the app on your home screen, the code is the only way to log in
(a link always opens in Safari, which has its own separate login). So
the code should come first, and the link should be the second option.

File: `supabase/templates/magic-link.html` only. No app code changes:
the live app already accepts the code (`verifyLoginCode` in
`lib/auth-actions.ts`).

### Hidden preview line
The grey line next to the subject in the inbox, and on the lock-screen
notification. It changes to:

    {{ .Token }} is your login code. Or tap the button to log in.

You can read the code straight from the notification without opening
the email.

### Layout, top to bottom (the card stays white, max 480 px wide)
1. "Meal Cost Tracker", small, matcha green (unchanged).
2. Heading: "Your login code" (was "Your login link").
3. The code, right under the heading: 32 px bold, spaced out (4 px
   between digits), near-black, on a light grey tile (#F0F0F0,
   rounded 8 px, like the app's tiles) so it stands out and is easy to
   long-press and copy. Sized so 8 digits fit on the narrowest phone
   (320 px). A row of digits can't wrap, so anything wider would push
   the email sideways. iPhones are told not to turn it into a blue
   "Call" link.
4. A grey line under it: "Type it in the app."
5. "Or tap the button to log in:" then the matcha Log in button
   (unchanged: 48 px tall, white text).
6. The small grey note, code first now and no longer suggesting two
   separate uses: "Use the code or the button: they're the same
   one-time login, and it expires in an hour."
7. The "Button not working? Copy this link" fallback, unchanged except
   a darker grey (#6b6b6b): the old #8a8a8a was 3.45:1.
8. Footer: "Nobody can log in without this code or link" (code first,
   to match), also #6b6b6b (the old #9a9a9a was about 2.6:1).

Also: the `<title>` becomes "Your login code", and the notes at the top
of the file list the code as way 1 and the button as way 2, with the new
subject line.

### Kept exactly as they are
Both links, character for character:

    {{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email

(the button's href, and the fallback link's href and visible text).

### Subject line
"Your Meal Cost Tracker login code" (was "...login link").

### When to paste it into Supabase
Right after commit 1 is approved and committed. No need to wait for a
merge or a Vercel deploy: the template lives only in Supabase, not in
the app, and the live app already accepts the code. Pasting changes
emails for localhost and the live site at the same time.

Where: Supabase dashboard, Authentication, Emails, Templates, "Magic
link or OTP". Subject: paste the new subject. Body, Source: paste the
whole file. Save changes.

### How to test
1. Before pasting: open the file in a browser on the laptop to check
   the layout (the `{{ ... }}` parts show as plain text there, so the
   code's width can only be judged in the real email on the phone).
2. After pasting: on the live site, log out, ask for a login email.
3. The notification and inbox preview start with the code.
4. Open the email on the iPhone: the code is the first thing under the
   heading, then the button.
5. In the home-screen app, type the code: you land on Today.
6. Log out again, ask for another email, tap the button instead: you
   land on Today in Safari (the link still works).

---

## Where every screen stands today

Found by reading every page and component (2026-11-16). "Error page"
means `app/error.tsx`: "Couldn't load this … Try again", which replaces
the whole screen. "Fine" means no change needed.

| Screen | Empty | Loading | Failed | Offline |
| --- | --- | --- | --- | --- |
| Today | Fine: first use ("Start with the foods you buy"), a day with nothing logged (real zeros, "Nothing logged yet today"), no targets ("Set daily targets"), swap with no other recipes | Skeleton, but shaped unlike the real screen (day arrows, Show details, meals) | Load: error page. Saves: message in the sheet. Recent-meals history failing: swap quietly ranks without it, says nothing | Swap, swipe-delete and Undo: handled. **Log it, Save changes: error page, sheet and amount lost** |
| Kitchen: Recipes | Fine: "Your staple meals go here" | Skeleton, close to real | Load: error page. Create: message | **Create recipe: error page** |
| Kitchen: Foods | Fine: "No foods yet" | **"Loading…" text, no skeleton** | Load: error page. Save, delete: message | **Save, delete: error page, form lost** |
| A recipe | Fine: no ingredients shows "—" and "Add an ingredient" (no fake $0). Gone: "This recipe doesn't exist anymore" card | Skeleton, missing rows, wrong heights | Load: error page. Actions: message | **Add/edit/remove ingredient, edit/delete recipe: error page** |
| Scan | n/a (no data) | "Starting camera…" over the camera, "Looking up…" with grey lines: fine | Fine: not found, Open Food Facts down, our error, camera blocked, each with Try again | Lookup: fine ("You're offline… The barcode is kept", Try again). **Save the food: error page, draft lost** |
| Settings | Fine: defaults | **One tall grey block, unlike the form** | Load: error page. Save: message | **Save: error page** |
| Login | n/a | **Nothing at all under the title** | Send: message. **Code: every failure, even the server being down, says "That code didn't work"** | **Send, log in, log out: error page saying "Nothing you logged is lost"** |

Also:
- **Fake zeros: none.** Skeletons draw empty grey rings with no
  numbers, and every main load fails loudly instead of quietly showing
  0. The zeros you see (an empty day's "$0.00", "0 foods") are real.
- **No spinners anywhere.** Good, nothing to remove.
- **The error page has no tab bar or header**, so "Try again" is the
  only way out.
- **There's no 404 page:** a mistyped address gets Next's plain,
  unstyled one.
- **Why offline saves land on the error page:** `guarded()` in
  `lib/server-helpers.ts` catches failures *on the server*. Offline,
  the request never reaches the server, so the failure happens in the
  phone, nothing catches it, and React hands it to the error page. Its
  comment says it covers "lost connection"; it doesn't. Today's swap,
  delete and Undo, and Scan's lookup, catch it themselves; nothing else
  does.

## Commit 2: loading looks like the real screen

Quiet grey skeletons in the real layout, so nothing jumps when the data
arrives. No spinners, no numbers.
- Shared pieces in new `components/skeleton.tsx`: the wrapper, a text
  line (the real line's height with a thinner grey bar), a form field.
- **Foods** (new `components/foods-skeleton.tsx`): the add-food tile's
  shape (name, brand, "Measured by", the four nutrition boxes, More
  nutrients, price and package size, the button), a short grey "foods"
  label, then four 96 px rows. Replaces "Loading…".
- **Settings** (new `components/settings-skeleton.tsx`): the targets
  tile with four h-11 fields, the water switch row and the Save button,
  so it's the form's real height.
- **Login**: the form's shape under the title (label, h-11 email box,
  h-11 button). Today it shows nothing.
- **Today** (`today-skeleton.tsx`): day arrows h-11 (were h-5), a
  "Show details" bar h-11, each meal as a label plus an h-11 block like
  the real "+ Add to breakfast" button (were h-14). The big ring stays:
  the skeleton can't know yet whether you have a calorie target, and
  most days you do.
- **A recipe** (`recipes-skeleton.tsx`): back link h-11, the cost as
  tall as the real 48 px number, the "Makes 2 servings" line and the
  Swap and "+ Add ingredient" buttons.
- **Screen readers**: each skeleton is a role="status" holding hidden
  text ("Loading your day…"), so it can be found and read. Before, it
  was an aria-label on a plain div, which most screen readers skip.
- **Today** shows its header straight away (it only needs the address
  and your timezone), then the day behind a skeleton that knows if it's
  a past day: no rings then, just the numbers (they were ~200 px too
  tall).
- Foods' delete: while it works, "Delete?" becomes "Deleting…" and
  Cancel goes (was "…" on the button, squeezing the name).

## Commit 3: a failed save keeps your work and says what happened

- **New `lib/action-call.ts`**: wraps a server action so that a
  failure *in the phone* (offline, the request dropped) comes back as
  a normal form message instead of reaching the error page. Next's own
  redirects (logging in with the code, logging out) are passed through
  untouched. Pure enough to unit test with a fake action
  that throws.
- Used by every form and button that saves: log a food or a recipe,
  edit an entry, add/edit a food, delete a food, create/edit/delete a
  recipe, add/edit/remove an ingredient, save targets, save a scanned
  food.
- **The message says what happened and how to retry**, next to the
  button that failed, with everything you typed still there. The
  button you just used is the Retry (see decision B).
  - Offline: "Couldn't save: no connection. Check your connection, then
    tap Save changes again."
  - Online but the connection dropped on the way: "Couldn't save: the
    connection dropped. Please tap Save changes again."
  - For saves that ADD something (Log it, a new recipe), a dropped
    connection may have saved it anyway, and tapping again would add it
    twice. So: "The connection dropped, so it may have worked anyway.
    Check Today before you tap Log it again.", and Today (or the recipe
    list) reloads behind the sheet so you can see.
  - After a deploy, an app left open has out-of-date actions and every
    tap would fail the same way: "The app was just updated. Close it and
    open it again (or reload the page), then try again."
- **Swap history** (`getEatenHistory`) failing: the swap sheet says
  "Couldn't load what you've eaten lately, so recent meals and foods
  you have aren't checked." Today it ranks differently and says nothing.
  The ranking itself doesn't change (unknowns already sort last).
- Fix `guarded()`'s comment so it no longer claims to cover a lost
  connection.

## Commit 4: the error page, a 404 page, and an offline strip

- **Error page** "Try again" waits while offline (focusable, does
  nothing, the strip says why): it reloads the page, and offline that
  would open the phone's "no internet" page.
- After a dropped save, Today (or the recipe list) reloads only once a
  tiny request reaches the server (`refreshIfReachable`), for the same
  reason.
- **Error page** keeps the tab bar, so you can leave (not on the login
  screen, where the tabs would only lead back to it). Its words stay
  ("Couldn't load this. Check your connection, then try again. Nothing
  you logged is lost."), which are now true, since only loading
  reaches it.
- **New `app/not-found.tsx`**: same tile style, "This page doesn't
  exist", "Go to Today", tab bar.
- **Offline strip** (new `components/offline-strip.tsx`, in the
  layout): while the phone is offline, a thin grey tile at the top, under
  the status bar, staying there as you scroll: "You're offline. Nothing
  can be saved or loaded until you're back online." (Saves aren't
  queued, so it can't promise they'll happen later.) Muted grey text,
  no colour, announced once (role="status").
  It slides away when you're back online (fade only with reduced
  motion).
- `day-rollover.tsx` and `timezone-sync.tsx` don't refresh the page
  while offline (today that leads to the phone's "no internet" page);
  they refresh once you're back online.
- Not doing: a service worker so pages open offline. That's caching
  data on the phone, a feature of its own.

## Commit 5: login

- The code box gets `enterKeyHint="go"` (the keyboard's Return key
  says Go). `autoComplete="one-time-code"` and `inputMode="numeric"`
  are already there. The email box gets `enterKeyHint="send"`.
- Words that match the code-first email: the button "Email me a login
  code" (was "link"), the line after sending "Check
  you@example.com for your login code." and the label "Code from the
  email".
- A code check that fails because our server can't reach Supabase says
  "Couldn't check the code just now. Tap Log in again in a minute."
  instead of "That code didn't work". The form now shows that kind of
  message (today only the code-box error shows). Messages hide while
  you try again, so a second identical failure is still seen and read
  out.
- A dropped connection while sending or logging in says to check first
  ("Check your inbox", "Reload the page (or reopen the app)"): the
  email may be sent, or you may be logged in, already.
- Sending, logging in and logging out offline: a message on the form,
  not the error page (with commit 3's helper). Log out becomes a small
  browser component (`components/log-out-button.tsx`) so it can show
  "Couldn't log out: no connection…" in a small bordered box under
  itself, with a × to close it; it also closes when you're back online.
- Log out: if Supabase refuses, it logs why and logs this phone out
  anyway (deletes the login cookie, Supabase's own suggested fallback).
  Today the error is ignored and you could stay logged in.
- The line under the title says "We'll email you a code and a link."
- The page gets a tab title, "Log in · Meal Cost Tracker".

## Commit 6: matcha focus rings

The "Polish later" list said 18 components. The audit found about 40
hand-made buttons and links in 26 files that show Safari's blue ring
(or none): the tab bar, header, day arrows, Show details, "+ Add",
entry, food, ingredient and recipe rows, the swap icon, back buttons,
kitchen switch, switches, More nutrients, text links and the camera
help.
- One shared class, `focus-ring`, defined once in `app/globals.css`,
  added to each of them. It only shows for the keyboard
  (:focus-visible), never on a tap. A twin, `focus-ring-inset`, draws
  it just inside the edge where the outside would be cut off: Today's
  entry rows (their list hides overflow for its animations). A third,
  `focus-ring-within`, rings the Meal options' labels around their
  hidden radio buttons. Options in a track (Meal, Recipes | Foods) keep
  the outside ring: inside, it would sit on the butter yellow, only
  1.2:1 in dark mode.
  Left as they are: the camera's buttons (their own solid light-matcha
  ring on the dark camera) and the swipe Delete (a white ring inside the
  red).
- **The ring itself** (decision A): today's shadcn ring is matcha at
  50% see-through, which is only 2.2:1 against white. A focus ring
  needs 3:1 to be seen. Proposed: solid matcha, 2 px, with a 2 px gap
  (6.0:1 on white, 5.3:1 on tiles, 7.9:1 in dark). The shadcn Button
  and Input switch to the same ring, so the app has one.

## Commit 7: error messages that screen readers hear

- **The edit sheet's error line**: shows only the latest problem (a
  newer Save error replaces an older Delete error and the other way
  round), clears when you try again, is read out (role="alert"), and
  "Yes, delete" keeps keyboard focus while deleting
  (`focusableWhenDisabled`, like Swap and Undo).
- The ingredient sheet has the same one-slot problem (an old Save
  error hides a newer Remove error): same fix.
- Every other form's message line gets role="alert" too: log a food or
  a recipe, ingredient, recipe, targets, food form, delete recipe.
- Field errors ("Type an amount") are linked to their box
  (aria-describedby), so a screen reader reads the error with the box.
  Today only the red outline says something's wrong.
- Foods: the delete error moves out of the row button (today it's read
  as part of the button's name) and "Yes" becomes "Yes, delete Oats" to
  screen readers.
- Messages hide while you try again, so a second failure with the same
  words is seen and read out again.
- Buttons that wait while they work (Save, Log it, Yes delete, Yes
  remove, Email me a login code, Log in…) keep keyboard focus
  (`focusableWhenDisabled`). After a failed delete or remove, focus goes
  back to the Delete / Remove / ✕ button that reappears.
- Errors that belong to no single box (the macros don't add up, barcode,
  unit, the expired link) are read out when they appear.
- A save that comes back with a box to fix ("Type an amount") moves
  focus to the first red box (`use-focus-first-invalid.ts`), so a
  screen reader reads its label, "invalid" and the error. Before, it
  said nothing.
- The duplicate-food dialog's buttons keep focus while saving and say
  "Updating…" / "Saving…". The edit sheet's Delete waits while a save
  runs (like Remove in the ingredient sheet).
- The expired-link line on Login is focused once when the page opens,
  so it's read out (an alert already there at load isn't).
- Left as is: the Edit recipe sheet has two message lines (the recipe's
  and Delete recipe's), each next to its own button.

## Commit 8: swap flick, Undo on first use, autoFocus

- **Swap stack**: only a gesture Framer locked sideways can Skip or
  Swap, never a scroll the browser took over. Same fix as Today's swipe
  row (`entry-row.tsx`: `onDirectionLock` plus ignoring
  "pointercancel").
- **First use keeps the Undo message**: the "Start with the foods you
  buy" screen draws the message too, so deleting your last entry with
  no foods left can still be undone.
- **autoFocus** (decision C): `BottomSheet` looks for a
  `data-autofocus` box inside it after it opens and focuses that,
  otherwise its title as now. Used for "New recipe"'s name box and the
  amount box when Today opens straight to a food after a scan. Those
  boxes keep their autoFocus too: it does work when the box appears in
  a sheet that's already open (picking a food from the list).

## Commit 9: tap targets, contrast and headings

Tap targets (at least 44 × 44 px):
- Foods' delete ✕, "Yes" and "Cancel" (28 px tall now) become h-11.
- Text links that stand alone get h-11: "Add one on Foods", "Add it on
  Foods", "scan a barcode" (first use), "Log that one". Recipe's "Edit"
  gets wider padding (42 px now); the food form's unit picker gets a
  44 px minimum width.
- Icon-only buttons: all already have names ("Close", "Previous day",
  "Tired of Oats? Swap it"…). Nothing to fix.

Contrast (text at least 4.5:1, light and dark), measured:
- Red buttons in dark mode ("Yes, delete" in sheets): 4.34:1, so the
  red tint behind the text gets lighter (5.19:1). Red hover tints go
  too (down to 3.6:1): hover keeps the resting colour.
- Matcha button hover with a mouse: 3.88:1, so hover gets 90% matcha
  instead of 80% (4.82:1).
- "Saving…", "Logging…", "Swapping…", "Undoing…" and similar are shown
  dimmed to 50% (about 2.2:1), but they're the only sign something is
  happening. Busy buttons stay full colour; only buttons that truly
  can't be used are dimmed (decision D): Save while a delete or remove
  runs, Remove while a save runs, Skip and Back while a swap saves.
  Dimmed with a grey colour, not opacity, so the focus ring on them
  stays solid.
- The scanner's hint over the camera can drop to 4.1:1 over a white
  box: it gets a dark pill behind it (8.4:1).
- Not text, so a decision (E): input borders are 1.3:1 on white, and
  white inputs on grey tiles are 1.14:1. Recommended: darken only the
  input border to #858585 light / #737373 dark (3.2:1 or more
  everywhere), leaving the tiles' barely visible borders as they are.

Headings (one h1 per screen, no skipped levels; none skip today):
- The live scanner gets a hidden h1 "Scan a barcode"; scan results
  ("Not on Open Food Facts yet"…) become h2.
- A food's or recipe's name at the top of a sheet becomes an h3 under
  the sheet's h2 (it's styled like one already).
- Foods: the add/edit form gets a hidden h2 "Add a food" / "Edit Oats",
  and tapping a food to edit moves focus there (today focus stays on
  the row while the page scrolls up).
- Smaller: the "$" before a price is hidden from screen readers like
  the units are; the camera help's "Other phone or app?" gets a chevron
  that shows open or shut.

## Decisions (approved 2026-11-16: A–E all the first option)

- **A. Focus ring**: solid matcha with a gap (recommended), or keep the
  faint see-through one everywhere.
- **B. Retry after a failed save**: the message names the button to
  tap again ("…tap Save changes again") and that button stays, with
  your input (recommended). Or a separate "Try again" button under each
  message, which sits next to an identical Save.
- **C. autoFocus**: let `BottomSheet` honour `data-autofocus`
  (recommended). On a laptop the cursor lands in the box. On an iPhone
  the keyboard won't pop up by itself (Safari only opens it after a tap
  on the box), but the box is ready. Or remove them.
- **D. Busy buttons**: full colour while busy (recommended), or keep the
  50% dimming.
- **E. Input borders**: darken only the input border (recommended), or
  leave them barely visible as now.

## Not in this plan

- Critique fixes 1 and 2 (focus nutrient, accent colour presets): in
  notes.md under "Next feature: make it yours".
- The rest of "Polish later" (one message slot, stale Undo text, the
  slide when deleting a meal's only entry, small Undo layout jumps,
  "0x10" in number boxes): not states or accessibility.
- A service worker for opening pages offline.
- Swap's arrow keys: Right runs the swap from anywhere in the sheet.
  That's as designed (plans/swap.md), and the sheet only holds the
  stack.
- Amount previews read out on every keystroke (aria-live="polite"):
  kept, because hearing "120 kcal · 9 g protein" as you type is the
  point.

## How to test (after each commit, and all at the end)

1. `npm test`, `npm run lint`, `npm run build`.
2. Loading: Chrome DevTools, Network, "Slow 4G". Open Today, Foods, a
   recipe, Settings, Login: grey shapes where the real things land,
   no jump, no numbers until the data arrives.
3. Offline: DevTools "Offline" (or airplane mode on the phone). Log a
   food, edit an entry, save a food, save targets, log in: a message
   next to the button, your input still there, the strip at the top.
   Back online, tap the same button: it saves.
4. A bad address (`/nope`): the 404 page with the tab bar.
5. Keyboard only on the laptop (Chrome, or Safari with "Press Tab to
   highlight each item" on): Tab through every screen and sheet. A
   solid matcha ring on everything, never Safari's blue. On the
   iPhone, tapping a button shows no ring; a text box you tap does
   (that's normal), and so may a button the app moves focus to after a
   tap (Skip after Back to card 1, Start over, Cancel in the duplicate
   dialog, Delete after a failed delete).
6. VoiceOver on the iPhone (Settings, Accessibility, VoiceOver): an
   error in a sheet is read out; a skeleton says "Loading"; the
   headings rotor lists one h1 per screen.
7. Swap stack: scroll the sheet quickly with a sideways drift: no card
   moves.
8. With no foods, delete your last entry: "Undo" is still there.
9. Dark mode: red "Yes, delete" and the busy buttons are easy to read.
10. Login on the iPhone home-screen app: the Return key says Go; the
    code is offered above the keyboard (Apple Mail).
