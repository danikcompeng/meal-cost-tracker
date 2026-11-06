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
   session (stored in a cookie), then sends me to `/ingredients`. If it fails: `/login?error=link`.
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
