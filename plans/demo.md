# "Try the demo" login (approved to build straight away, 2026-11-22)

People you share the app with can't get a login email (Resend only
delivers to your address), so the login page gets a "Try the demo"
button that signs into one shared demo account with no email at all.

## 1. Signing in

- Login page: under the email form, a thin "or" line and a full-width
  "Try the demo" button (secondary style, so "Email me a login code"
  stays the main action). Hidden when the demo isn't set up.
- The button runs a server action, `signInDemo` (lib/demo-actions.ts).
  It reads `DEMO_EMAIL` and `DEMO_PASSWORD` from the server's
  environment and calls Supabase's `signInWithPassword`. The browser only
  ever sends "the demo, please": it never sees the email or password.
  Both names have no `NEXT_PUBLIC_` prefix, so Next.js can't put them in
  the browser bundle, and lib/demo.ts imports "server-only", so a
  browser file that imports it fails the build.
- Typing the demo email into the normal email form says "Use Try the
  demo" instead of sending an email nobody can read.

## 2. Sample data (lib/demo-seed.ts, lib/demo.ts)

- The same foods, recipes, meals and targets as
  design/ui/motion/seed-demo.sql, written as TypeScript data.
- Seeding runs on the server as the demo user, through the normal
  logged-in Supabase client, so Row Level Security applies and it can
  only ever touch the demo account's own rows. No service-role key.
- Order: delete the demo's meal entries, recipes (their ingredients go
  with them), foods; insert foods, recipes, ingredients, meals; save the
  targets. Snapshots (kcal, cost, water...) are worked out by the same
  pure functions the app uses when you log (snapshotFor,
  recipeSnapshotFor), so they can't drift from the app's maths.
- "When was it seeded" is kept on the demo account itself (Supabase user
  metadata, `demo_seeded_at`), written only after a seed succeeds, so a
  half-finished seed is redone next time.
- On demo sign-in: reseed if it was never seeded, seeded over an hour
  ago, or the date is unreadable or in the future.
- Settings, demo account only: a "Reset demo" tile with a two-step
  "Reset demo?" / "Yes, reset" (no browser pop-up). It reseeds now and
  goes to Today.

## 3. Making it obvious

- A small "Demo" chip next to Settings / Log out in the header on every
  screen, for the demo account only.

## 4. What's blocked (so the next person finds it working)

Everyone shares one account, so the starter foods and recipes are kept
as they are:
- The sample foods and recipes can't be edited or deleted, and the
  sample recipes' ingredients can't be changed. The server says so:
  "This is a sample food in the demo. Add your own to try editing."
- Everything else works: log, edit, swap and delete meals; add, edit and
  delete your own new foods and recipes; scan; change targets; log out.
- The demo account's email can't be used to ask for a login email.

"Sample" = created at or before the last seed (demo_seeded_at). The
check is in the server actions, so it holds whatever the screen shows.

Known limits (said plainly):
- Someone determined could still use the demo's own login token
  against Supabase directly, outside the app: change the data (a reset
  fixes it), or change the demo password (then the button says "The demo
  isn't working right now", and you set a new password in the dashboard
  and in Vercel). Blocking that needs a service-role key or a database
  trigger on Supabase's auth tables; not done.
- Two people in the demo at once see each other's meals, and a reseed
  (an hour after the last one) clears what the earlier person logged.
- Two demo sign-ins in the same second could both reseed and leave two
  copies; "Reset demo" fixes it.
- Supabase limits sign-ins per IP address, and every demo sign-in comes
  from Vercel's servers: if many people try within minutes, the button
  says "Too many people just tried the demo. Try again in a minute."

## 5. What you set up (once)

1. Supabase: Authentication → Users → Add user → Create new user, with a
   made-up email and a long password, "Auto Confirm User" ticked.
2. Vercel and .env.local: `DEMO_EMAIL` and `DEMO_PASSWORD`.
No migration.
