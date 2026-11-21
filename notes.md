# Notes

## 2026-11-05: "Couldn't send the email" bug

- **Symptom:** the login form only said "Couldn't send the email. Try again in a minute."
  That's on purpose (`lib/auth-actions.ts:30`): users get a friendly message, not internals.
- **How I found it:** the real reason is logged in the **dev server terminal**
  (`lib/auth-actions.ts:25-29`, prints `message`, `status`, `code`). Read the terminal, not the browser.
- **Cause 1, wrong URL:** I couldn't find the Project URL inside Supabase, so I copied the
  address from my browser's address bar (the Supabase *dashboard* page) into
  `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`. That's the address of the website I use to
  *manage* my project, not my project's own API. The app needs the Project URL, which looks
  like `https://<project-id>.supabase.co`.
  - Fixed by pasting the real Project URL from the Supabase dashboard, then **restarting the
    dev server** (env files are only read at startup).
  - The error came from the wrong link: nothing was actually reaching my Supabase project,
    because the app was knocking on the dashboard website instead.
  - Lesson: a URL that looks right isn't always the right one. Check what the key *asks for*.
- **Cause 2, rate limit:** after fixing the URL, Supabase refused because I'd asked for
  too many emails in a short time. Supabase's built-in email sender is only for testing and
  allows very few emails per hour.
  - Fixed by creating a **Resend** account and setting it up as **custom SMTP** in Supabase.
    Now Supabase hands the emails to Resend to deliver, and the tiny built-in limit no longer applies.
  - SMTP = the standard way servers send email. "Custom SMTP" means "use my email provider, not yours."
- **Lesson:** one vague error message can hide several different causes, so check the log every time.

## Why `.env.local` stays out of Git

- It holds my Supabase keys. Anything committed to Git stays in the history forever,
  even if deleted later, and gets pushed wherever the repo goes.
- `.gitignore` line 34 (`.env*`) keeps all env files out automatically.
- On Vercel, the same values go in the project's Environment Variables settings instead.

## How magic link login works

1. I type my email. `sendMagicLink` asks Supabase to email me a one-time link
   pointing to `/auth/confirm`.
2. Clicking it opens `app/auth/confirm/route.ts`, which swaps the link's token for a real
   session (stored in a cookie), then sends me to `/foods` (was `/ingredients` before the 2026-11-09 rename). If it fails: `/login?error=link`.
3. **PKCE (same browser):** Supabase's default link carries a `code`. When I asked for the link,
   my browser saved a secret "verifier" in a cookie. The `code` only works together with that
   verifier, so **I must open the link in the same browser I requested it from**
   (`exchangeCodeForSession`, line 23). Opening it in the Gmail app's built-in browser or on
   another device fails. That's the security point: a stolen link alone is useless.
4. The route also accepts a `token_hash` link (line 18) that works on any device, but only if
   the Supabase email template is changed to send one.

## A prompt that worked well

- **"Commit and push all new code, ensuring that .env.local files are not pushed to github"**
  Says the goal *and* the one thing that must not go wrong, so the secret check is part of the job.
- **"Explain the function of files to me"**
  Asks for understanding, not just working code. I learn what each piece is for.
- **"Check with me before commiting to a plan so I can make changes"**
  Keeps me in control: I see the plan before any code is written and can change it while
  that's still cheap.
- **"Walk me through lib/cost.ts in plain language, line by line. Then ask me 3 questions
  about it, one at a time, and wait for my answers. Don't change any files."**
  Sets the explanation level, turns reading into a quiz (showed me what I really understood),
  and sets a clear limit.

Pattern: say **what** I want, **how** I want it, and **what must not happen**.

## 2026-11-06: A code-reviewer subagent

- **What a subagent is:** a separate Claude with its own instructions, its own tools and a fresh
  context window. The main Claude Code session hands it a job ("review this feature") and gets
  back only the conclusions, so my main conversation stays focused.
- **What mine does:** `.claude/agents/code-reviewer.md` reviews code before I commit, against the
  rules in CLAUDE.md. It checks, most important first:
  - **Bugs:** cost math (unit conversion, divide-by-zero, Postgres numbers converted with
    `Number()`), missing `await`, ignored Supabase `error`s, live data being cached.
  - **Security:** no secret keys in `NEXT_PUBLIC_` variables, Row Level Security on every
    table, server-side input validation, no open redirects.
  - **Readability:** small components in `/components`, data logic in `/lib`, pure cost functions.
  - It reports `file:line`, what's wrong, why it matters and a suggested fix, then ends with one
    thing the code does well.
- **Design decisions I made, and why:**
  - **Read-only** (`tools: Read, Grep, Glob`): a reviewer that can edit files could "fix" things
    I never approved. It finds problems; I decide what changes.
  - **Project memory** (`memory: project`): it keeps notes in
    `.claude/agent-memory/code-reviewer/MEMORY.md` across sessions, such as mistakes I repeat and
    decisions already made (e.g. "ingredients use `connection()`, not caching, so prices stay
    fresh"), so it doesn't re-raise findings I chose not to fix. It never stores secrets.
  - **Explains in plain language**, because I'm learning, and the "why" is the part that teaches.
- **How I use it:** "Use the code-reviewer subagent to review the recipes feature before I commit."
- **First real review (2026-11-07), `lib/cost.ts`:** verdict "minor issues". It caught that a
  package size of 0 would quietly show an ingredient as **free** (a wrong number that looks normal),
  that nothing guards against `NaN` showing up as "$NaN", and that the file has no unit tests yet.
  It also created its memory file and noted what to check when cost per serving is added.
- **Gotcha:** project agents only load if Claude Code starts **inside the project folder**
  (`cd ~\Documents\meal-cost-tracker`, then `claude`). Started elsewhere, it can't find the agent by name.
- **How the loop works:** the reviewer only *finds* problems (it's read-only). The main Claude
  session fixes them, re-runs the tests, and I decide what gets fixed before anything is committed.
- **Review log** (every feature since gets reviewed before its commit):
  - **Nov 7, cost function:** a package size of 0 showed a food as free; no NaN guard; no tests. Fixed in `599293a`.
  - **Nov 9, macros on foods:** the "check your numbers" warning vanished after fixing just one
    of four macros when the unit changed. Fixed by tracking the unit per macro (`9e1360b`).
  - **Nov 9, daily food log:** six bugs (`8ca92ae`): rounding errors that grew with each edit
    (1 g of rice edited to 500 g cost $2.50, not $2.48), "1,000" read as 1, an app left open
    overnight logging to yesterday, a dropped connection replacing the whole screen, keyboard
    focus not returning after closing the sheet, and a broken empty-search message.
  - **Nov 9, 0 kcal fix:** the "0 kcal doesn't fit" hint stayed silent when a box was blank (`3643f0f`).
  - **Nov 11, daily targets:** no bugs. It caught the low-calorie note flashing up while typing
    "2000" (the box passes through 2, 20 and 200), so the note now waits until you leave the box.
    Also a missing test at exactly 20% and a component name that clashed with a type.
  - **Nov 11, debugging the add sheet:** on localhost, "+ Add to breakfast" seemed dead. The sheet
    really opened, then shut itself within about 30 ms: in development React runs every effect
    twice (open, practice close, open again), and the late "closed" message from the practice
    close shut the re-opened sheet. Dev only, production was fine. Fixed by ignoring a close
    message when the sheet is open again. The "unstable value `new Date()`" warning was a
    separate problem, not the cause: partialPrefetching pre-builds a per-login page, so reading
    the clock after the cookie wasn't enough. Fixed with `await io()` before reading the clock.
    Lesson: I guessed the warning was breaking the buttons; watching what happened on a tap
    proved it wasn't.
- **Lesson:** CLAUDE.md is always-on rules for the whole project; a subagent is a specialist with
  limited tools that I call for one job. Giving AI the *least* access it needs is a safety habit.
  
## 2026-11-07: Switched the palette from cream to white

- **First direction:** warm cream background with olive text, from my Apple Health and matcha references.
- **What went wrong:** on my screen the cream looked almost white. I measured it with dev tools:
  the committed value was #FAF8F2, paler than the #F6F2E7 we'd agreed in chat. The spec file
  (CLAUDE.md) had drifted from the conversation.
- **Decision:** I wanted it crisper anyway, so I switched to black ink on white with matcha green
  as the single accent. Kept Fraunces and Figtree so it still has personality.
- **Lessons:** measure colors instead of eyeballing them, and treat CLAUDE.md as the source of
  truth, not the chat. Separate Claude Code sessions don't share memory, only files and git history.
- Before/after screenshots: design/ui/before/ and design/ui/after/.

## 2026-11-09: Competitor research

Tried the closest apps myself:
- **Eat This Much:** generates recipes with random ingredients most people
  don't have, and never reuses them. Has a daily price limit, but no real prices.
- **MealMate:** high-protein plans and food scanning, but mostly paywalled
  and no prices at all.
- **equ:** swaps meals with similar macros, but ignores ingredients and cost.
- **CostBite:** shows food cost with macros, but prices are estimates and
  there's no swap.

**The gap:** none of them let me repeat my own cheap staple meals, and when
I'm bored, swap to a meal with the same protein using ingredients I already
bought, priced at what I actually paid.

**Pitch:** "Cheap meals that hit your macros, on repeat, with a swap when
you're bored."

## 2026-11-09: My design rules (from Refactoring UI)

How to use these: before approving any screen, check it against each rule.
If one fails, tell Claude exactly which rule and what to change.

### Rule 1: Not everything can be important
- **In my words:** Each screen has one main number. Everything else is quieter.
- **In my app:** On Today, calories is the big number. Protein is second (matcha-colored),
  then carbs and fat, and cost is last in small grey.
- **How I check it:** Squint at the screen. The first thing I notice should be
  the main number.

### Rule 2: Designing the empty state first
- **In my words:** The app should look inviting for first time users, once foods, goals, and meals are added, a tighter UI won't be intimidating to those who are used to the app
- **In my app:** More spacing between stats and input, arrows to input and get started, and helpful tips for first time users
- **How I check it:** App should not look intimidating, not a bunch of numbers, inviting imagery and logos should span the screen

### Rule 3: Fewer, less bold borders
- **In my words:** Should look like the iPhone Health App UI, slight change in background shades indicate a border between metrics and data
- **In my app:** Stats should have a very dark grey, but it must be distinguishable from the clean black backgroground
- **How I check it:** Border should be slightly visible, and flows naturally throughout the app

### Rule 4: Hierarchy uses weight and color, not just size
- **In my words:** Different information is denoted by a difference in color, size, and positioning in relativity to each other
- **In my app:** Stats of foods won't have different sizes, but the less important macros may have a lighter grey color, or a smaller font
- **How I check it:** By looking at the size and color of information and ensuring that they show a clear, but clean distinction

### Rule 5: Labels are a last resort
- **In my words:** I don't want the app to look like it was made for a nutritionist. Protein:, Fiber:, looks intimidating and pretty ugly
- **In my app:** The value does the work "20g protein", looks a lot nicer than: "Protein: 20g"
- **How I check it:** Making sure that the app doesn't look like a nutritional values list, while providing useful information

### Screen reviews
| Date  | Screen             | Rule broken                                         | What I told Claude                                                               | Fixed? |
| ----- | ------------------ | --------------------------------------------------- | -------------------------------------------------------------------------------- | ------ |
| Nov 7 | Login, Ingredients | Color: the cream background looked like plain white | Measured it with dev tools: #FAF8F2, not the #F6F2E7 we'd agreed. Asked Claude to find where it came from and check every color against CLAUDE.md. | Yes, found CLAUDE.md had drifted from the chat |
| Nov 7 | Login, Ingredients | Color: the whole palette felt faded                 | Switched to black ink on white with matcha as the one accent, keeping Fraunces for personality. Asked for contrast checks on every color. | Yes, before/after in design/ui/ |
| Nov 9 | Foods form | Price is required, but CLAUDE.md says a food with no price should show "no price yet" | Not sent yet. Tracked for when purchases are built: price moves off foods and becomes optional. Workaround: $0 for free food like tap water. | No, after the month |
| Nov 9 | Today | Water with 0 kcal and blank macros shows "+ 1 unknown" under every macro | 0 kcal means 0 protein, carbs and fat, so save blank macros as 0 when kcal is 0. Fix my existing water. | Yes |
| Nov 11 | Today | Fraunces looked old-fashioned for a fitness app | Compared Fraunces, Figtree, Geist and Manrope side by side on a preview page, chose Figtree bold for one clean font across the app | Yes |

## 2026-11-17: Craft pass (plans/craft.md)

Small details that make the app feel finished, without changing how it
looks at a glance. Before/after screenshots: `design/ui/craft/before/`
and `design/ui/craft/after/` (Today, a swap card, a sheet; light and
dark). Both sets use the same made-up meals from a preview page
(`design/ui/craft/preview-page.tsx.txt`), so only the design changes
between them.

| Technique | What changed | Where to look |
| --- | --- | --- |
| Dark mode depth | Sheets one step lighter than tiles, tiles inside sheets one more; no shadows in dark | `swap-card-dark.png`: the card no longer melts into the sheet |
| Concentric corners | Inner radius = outer − gap (border included), e.g. the Meal switch's pill 8 → 5 px | `sheet.png`: the yellow Dinner pill |
| OKLCH colours | Same colours, rewritten so an accent preset only changes the hue; a test checks every colour and its contrast | no visible change (that's the point) |
| See-through borders | Edges show the same on white, grey tiles and dark sheets | the ingredient chips and the card edge in `swap-card*.png` |
| Icon line weight | Icon lines match the text beside them (measured Figtree: medium strokes are 0.094 of the font size) | the shuffle icon and Skip / Swap icons |
| Blur-and-fade swap | The torch icon blurs between on and off (Android only) | not in the screenshots |

Skipped on purpose: edge fades (nothing scrolls sideways yet), OKLCH
gradients and mix-blend-mode (no gradients or photos), and the details
toggle (its chevron rotates, which already says open/closed).

**Lessons:**
- "Same look" can be proven, not eyeballed. Every colour converted to
  OKLCH was checked to come back to the exact same hex, in a test and in
  the browser.
- The concentric rule counts the border too. The plan said 6 px; it's
  5 px.

## Polish later

Found during the polish pass (2026-11-15, plans/polish.md) but not fixed
there. Most important first.

- **Swap stack: a diagonal scroll can count as a flick.** swap-stack.tsx
  decides Skip / Swap from the finger's speed, even when the browser took
  the touch as a scroll. A quick scroll that drifts sideways could skip a
  card or swap a meal. Today's swipe-to-delete got the fix (only count a
  gesture Framer locked sideways, never a cancelled touch); copy it there.
- **One message slot.** A newer message (a swipe, a swap) replaces the
  Undo message on screen. If an Undo fails after its message was
  replaced, it now comes back with its own Undo, but the newer message's
  Undo is the one lost then. Rare; would need a small stack of messages.
- **The edit sheet's error line** shows an old Save error over a newer
  Delete error, never clears the Delete error, isn't announced to screen
  readers (no role="alert"), and "Yes, delete" drops keyboard focus while
  deleting (needs focusableWhenDisabled, like the Undo button).
- **Undo message text can go stale.** "Lunch is now Lentil dal · 1.5
  servings" stays until you tap ×, even after you edit that entry. Undo
  then rightly refuses ("It's changed since"). Could close the message
  when its entry is edited or deleted.
- **Deleting a meal's only entry** doesn't play the slide and fade: the
  whole list is swapped for the big "+ Add to …" button at once. Keep the
  list on the page and pick the button style from the number of rows.
- **First-use screen hides the Undo message.** With no foods left,
  deleting your last entry shows "Start with the foods you buy", which
  doesn't draw the message, so its Undo disappears.
- **Hand-made buttons use Safari's blue focus ring**, not the matcha one
  (18 components, e.g. entry-row's swap button, meal-section's "+ Add",
  the tab bar). Give them `outline-none focus-visible:ring-3
  focus-visible:ring-ring/50` like the shadcn Button.
- **autoFocus that never works when a sheet opens**: recipe-form's name
  box ("New recipe") and LogFoodForm after a scan. React focuses them
  while the sheet is still shut. Remove them, or let BottomSheet honour a
  `data-autofocus` marker (decide whether the keyboard should pop up).
- **Undo message, small layout things**: the page jumps up by the spacer
  when the message closes while you're scrolled to the bottom (the spacer
  goes before the fade ends), and "Undoing…" is wider than "Undo", so the
  text reflows while you wait.
- **Typed numbers accept computer formats**: parseDecimal uses Number(),
  so a pasted "0x10" logs 16 and "1e2" logs 100. A phone keypad can't
  type them; a laptop or a paste can.

## Today screen critique (Nov 16)

Works:
1. Logging: one tap on "+ Add to lunch", recipes above foods, and the
   rings update straight away.
2. Scanning: the middle tab opens the camera instantly, and a food I've
   scanned before goes straight to logging.
3. Recipes and cost: each recipe shows cost per serving and all 8
   nutrients, and a missing value shows "—", never a lower number.

To fix:
1. Protein is always the green one. The accent says protein is what
   matters, but not everyone tracks protein. Fix: let me pick a focus
   nutrient that gets the accent and the top spot.
2. One fixed accent colour. Apps like Transit let you pick yours. Fix:
   5–6 preset accents, each checked for contrast in light and dark.
   Presets, not a free colour picker, so no choice can make the app
   unreadable.
3. The login code was hidden on the lock screen, so I had to open Gmail
   to see it. Fix: the code now comes first in the email's preview line
   (c035d9b).

## Next feature: make it yours

Critique fixes 1 and 2, held back from the states and accessibility
pass (2026-11-16, plans/states-a11y.md) because each is a feature of
its own. Plan both before building, like every feature.

1. **Focus nutrient.** Today, protein always gets the matcha accent and
   the second spot, which says protein is what matters. Not everyone
   tracks protein. Let me pick a focus nutrient (calories, protein,
   carbs, fat, maybe fiber or water) that gets the accent and the top
   spot on Today. Things to decide: where the choice lives (Settings,
   next to the targets), and what happens to protein per dollar, the
   app's own number, when protein isn't the focus.
2. **Accent colour presets.** One fixed accent today. Apps like Transit
   let you pick yours. Offer 5–6 preset accents, matcha first, each
   checked for contrast in light and dark: text on background, tiles,
   popovers and hover, and white or dark text on the accent's buttons,
   the same 4.5:1 rule as the palette in CLAUDE.md. Presets, not a free
   colour picker, so no choice can make the app unreadable. Things to
   decide: which tokens change with it (primary, ring, matcha-soft) and
   where the choice is saved (user_settings).

   ## 2026-11-20: Learning: JavaScript

   -swap.ts is a javascript file that handles how the recipe switcher works.
   -It determines which recipes are similar to the recipe that needs to be switched, and it orders them using 4 facts, in this order: protein similarity(close protein first), how many foods you'd need to get(fewest first), price(cheaper or about the same first), and if you ate it recently(not in the last 3 days first)
   -By comparing these nutrient facts of the other logged meals, the swap.ts file assigns values to rank each meal(Decorating)
   -It then undecorates the recipes and returns the most similar recipes in order of most similar to least.

   ## 2026-11-20: Learning: React

   -entry-row.tsx is purely UI with almost no logic. It just takes the user's action input and calls a function to do it
   -Like when a user taps the swap icon(the shuffle arrows) on a row, entry-row.tsx calls the function "onSwap", which opens the swap sheet. The sheet uses data from swap.ts which only runs once, and then displays the recipes as cards. Swiping the row left is different, it opens the trash can to delete it
   -Props vs state: props are what a component is handed by its parent(entry-row.tsx gets the entry and onSwap from meal-section.tsx), and it can't change them itself. State is what a component remembers and changes on its own, and changing state redraws the component. Example: which row is swiped open is state in today-view.tsx(openRow), and each entry-row.tsx gets it as the prop "open", so only one row is open at a time
   -"use client" at the top of a file means that component runs in the browser, not only on the server. It's needed for anything the user interacts with: taps, swipes, state, animations. Without it the component is made once on the server and sent as plain HTML

## 2026-11-20: Motion pass (branch `motion`, plans/motion.md)

The app does the same things, and feels more physical. Every timing is a
token in lib/motion.ts (tested to stay 150–250 ms for anything that
answers a tap). What changed, in short: buttons and rows press in
(0.97 / 0.985); the Undo message settles in; wrong boxes shake; days and
Recipes | Foods slide from the side you moved to; error lines and sheets
open their space smoothly and sheets slide down when they close; a
deleted row slides off like iPhone Mail; a swap on Today is one carousel
move left; rings fill on an easeOutQuart curve once per visit; swap cards
stay flat, Skip throws them with your finger's speed, and rows and cards
stretch on a rubber band past their limits. Reduce Motion: fades or
jumps everywhere. Before / after clips: design/ui/motion/before and
after.

Lessons:
- A preview only shows what's pushed. Push, wait for Ready on that
  commit, then test.
- Measure motion frame by frame (positions, gaps), not by eye: the first
  swap slide looked fine and was 40 px apart mid-move.
- Next.js cacheComponents keeps visited pages alive but hidden. Anything
  that decides "on first appear" must decide each time it's shown
  (layout effects), and remember handled answers in refs.
