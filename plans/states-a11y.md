# States and accessibility

Note: the rest of this plan wasn't saved to a file, so only commit 1 is
written down here so far. The other commits come after it.

## Commit 1: login email shows the code first

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
