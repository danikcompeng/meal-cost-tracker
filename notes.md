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
| Nov 9 | Today | Water with 0 kcal and blank macros shows "+ 1 unknown" under every macro | 0 kcal means 0 protein, carbs and fat, so save blank macros as 0 when kcal is 0. Fix my existing water. | Pending |