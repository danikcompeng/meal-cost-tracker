# Installable app ("Add to Home Screen") (draft, waiting for approval)

Make the app installable on iPhone and Android: its own icon and name on
the home screen, opening full screen without the browser's address bar,
straight onto Today. No offline caching, no service worker.

## 0. Decisions to confirm first

My defaults are in brackets. Say "yes" to keep them all, or change any.

1. **Short name under the icon: [Meal Cost].** iPhone cuts names off at
   about 12 characters, so "Meal Cost Tracker" (17) would show as
   "Meal Cost Tr…". Other options: "Meals", "MealCost".
2. **Status bar on iPhone: [opaque, "default"].** The page starts below
   the clock and battery, so nothing can ever sit under the notch or the
   Dynamic Island. Not "black-translucent" (see section 2 for why).
3. **Login: [add a 6-digit code to the login email].** The simplest fix
   that works every time on both phones (section 3). The other option is
   no code change at all and one rule to remember: "log in in Safari
   before adding to the home screen".
4. **Status-bar colour = the page background** [white / near-black], so
   the bar blends into the page. Matcha stays for actions only.
5. **Two small fixes I found while checking** (say no to either):
   a. The Undo message may cover the top of the Scan button (section 2).
   b. The "camera is blocked" help for Android says "tap the icon at the
      left of the web address", and the installed app has no address bar.

## 1. What changes on screen

- **Browser tab:** the Next.js triangle icon is replaced by the app's
  placeholder icon.
- **Home screen:** a matcha-green square with a plain white bowl drawn on
  it (no letters, so the rename later doesn't force a new icon), named
  "Meal Cost". iPhone rounds the corners itself. Android cuts it to its
  own shape (circle, squircle...), so there's a "maskable" version with
  the bowl kept well inside the middle, where no shape can cut it.
- **Opened from the home screen:** no Safari or Chrome bars at all. It
  opens on Today (or Login if you're logged out).
  - iPhone: the clock and battery sit on a bar the colour of the page
    (white, or near-black in dark mode); the page starts below it.
  - Android: the status bar is white or near-black to match, and a short
    splash screen (icon on white) shows while it starts.
  - At the bottom, the tab bar's background runs to the very bottom of
    the screen, with Today / Scan / Kitchen sitting just above the
    iPhone's home bar (the thin line you swipe up on). Bottom sheets
    reach the bottom the same way, their buttons above the home bar.
  - The Undo message ("Lunch is now Lentil dal · Undo") sits just above
    the tab bar.
- **Login screen** (if you approve 3): after "Check you@example.com for
  a login link" there's now a field: "Or type the code from the email",
  a "Log in" button, and "Use a different email".
- **Login email:** the "Log in" button stays, and below it a big code
  ("Or type this code in the app: 123456").
- Nothing else changes. In a normal Safari tab, one small difference:
  when Safari's bottom toolbar shrinks as you scroll, the tab bar now
  moves up by the home bar's height instead of sitting on top of it.

## 2. iPhone details

**Status bar.** iPhone has three styles:
- `default`: a solid bar; the page starts below it. My pick.
- `black-translucent`: the bar disappears and the page draws underneath
  the clock, so every screen would need extra top padding. Reports say
  that since iOS 26.1 Apple also draws a dark shade over that area that
  the page can't turn off, so on our white page you'd see a grey smudge
  behind the clock. Not worth it.
- `black`: always black, which looks wrong on a white page.

One thing I can't promise from reading: sources disagree on whether iOS
26 colours the solid bar from the page or from the `theme-color` tag in
dark mode. We set both to the same colour, so either way it should
match. It's a test step on your phone (section 6).

**Safe areas (notch, Dynamic Island, home bar).** The code is already
ready for them: the tab bar, the Undo message, bottom sheets, the scanner
and the scan result all add `env(safe-area-inset-bottom/top)`, which is
"how tall the home bar / notch is". But right now that value is always 0,
because the page doesn't tell iPhone it wants to fill the whole screen.
Adding `viewport-fit=cover` to the viewport tag switches it on, so those
paddings start working (about 34 px at the bottom of a Face ID iPhone).
Two follow-ups:
- Each screen has 7 rem of empty space at the bottom so the last item
  isn't hidden behind the tab bar. With the home bar added, the tab bar
  grows to about 6.5 rem, leaving only about 9 px. I'll add the home-bar
  height to that space on the 5 screens with a tab bar.
- My reading of the CSS says the Undo message sits about 1 rem over the
  top of the round Scan button (the button pokes up out of the tab bar,
  and the message is placed just above the bar's edge). That's true in
  Safari today too, not new. I'll measure it in the browser first, and
  if it does overlap, move the message up to clear the button.
- Sideways (landscape): all content is in a centred column narrower than
  the screen, so it stays clear of the notch. I won't lock the rotation
  (some people need it, and iPhone ignores the lock anyway).

**No zoom when tapping inputs.** iPhone zooms in when you tap a field
whose text is smaller than 16 px. Every field on a phone is already 16
px, so this already works. One catch: the shared input style drops to 14
px on screens 768 px and wider, so an iPad zooms. I'll remove that so
it's 16 px everywhere. I won't use the other trick (`maximum-scale=1`):
it also blocks pinch-to-zoom for anyone who needs bigger text.

**Things that are just different in an installed iPhone app** (no code,
good to know):
- There's no reload button and no pull-to-refresh. To reload, swipe the
  app away in the app switcher and open it again.
- Swipe from the left edge still goes back.
- The camera may ask for permission again: the installed app is separate
  from Safari. The "camera is blocked" help already has iPhone
  home-screen steps.
- Your name and icon are copied once when you add it. After the rename,
  delete the icon and add it again. (Android updates it by itself.)

## 3. Login with magic links once installed

**Why it breaks.** On iPhone, an installed web app keeps its own cookies,
separate from Safari. Your login is a cookie. Since iOS 17.2 there's one
exception: when you add the app, iPhone copies Safari's cookies into it
once. After that the two never share again. And no link can open a
home-screen web app: links always go to Safari (or Gmail's own browser).

**What you'll experience today, without changes:**
1. You're logged in in Safari and tap Add to Home Screen: the app opens
   logged in. It stays that way: the login cookie lasts 400 days and is
   renewed every time you open the app, so in practice you log in once.
2. But if you're ever logged out in the app (you tapped Log out, or you
   added it while logged out): you type your email in the app and see
   "Check your email". You open Gmail and tap Log in. It opens in Gmail's
   built-in browser or in Safari, and **that** browser is now logged in,
   not the app. Back in the app you're still on "Check your email", and
   the link is used up. The only way out is to delete the app, log in in
   Safari, and add it again.

**Android is fine as it is.** An app installed from Chrome shares
Chrome's cookies, and Gmail opens links in Chrome (or in the app). Tap
the link, go back to the app, close and reopen it: you're logged in.

**Simplest fix: a 6-digit code in the same email.** Supabase already
makes one with every login email; we only have to show it (`{{ .Token }}`
in the email template) and add a field to type it into. The app checks
it with `verifyOtp({ email, token, type: "email" })`, so the login cookie
is saved inside the app, where you typed it. One email, two ways:
- In the installed app: read the code in Gmail, switch back, type it.
- In a browser or on a laptop: tap the button as now.
- They're the same one-time login, so using one uses up the other. In
  the app, type the code; don't tap the button.
- Bonus: the code doesn't use the redirect address, so logging in on a
  Vercel preview works without adding its address to Supabase.

The field uses `autocomplete="one-time-code"`, so if you ever use Apple's
Mail app, iPhone offers the code above the keyboard. With Gmail you copy
it by hand. Wrong or expired code: "That code didn't work. Check the
email, or get a new one." The code lasts as long as Supabase allows
(1 hour by default). The field accepts 6 to 10 digits, since Supabase
lets you change the length; I'll check yours says 6.

## 4. Service worker: not needed

A service worker is a script the browser keeps running in the background
for a site. It's what makes offline mode and push notifications work.
For installing, neither phone needs one any more: Chrome dropped that
requirement in 2023 and iPhone never had it. It needs https, a manifest
and icons. So there's none. Leaving it out also avoids its usual
problems: showing yesterday's cached page, or showing your data after
you've logged out. Offline, the installed app shows the phone's own "no
connection" page; once you're back online it works again.

## 5. Files

New:
- `lib/app-identity.ts`: name, short name, description and the two
  status-bar colours, in one place. The rename is mostly this file.
  (The colours copy `--background` in globals.css; a manifest can't read
  CSS, so a comment in each points to the other.)
- `components/app-icon.tsx`: **the icon, the one file to swap.** Just a
  drawing (a white bowl on matcha). When the real icon comes, it can be
  pasted in as SVG, or as a 1024 px PNG image.
- `app/icons/[file]/route.tsx`: turns that drawing into the PNG files
  phones want (`next/og`'s ImageResponse), made once at build time:
  `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (Android) and
  `apple-touch-icon.png` (180 x 180, iPhone). Any other name: 404.
  They end in .png, so the login check in `proxy.ts` already skips them.
- `app/manifest.ts`: the manifest, served at `/manifest.webmanifest`:
  name, short name, `id: "/"`, `start_url: "/"` (Today), `display:
  "standalone"`, `background_color` and `theme_color` white, the icons.
  `id` keeps Android treating it as the same app after the rename.
  A manifest only takes one colour of each, so dark mode is handled by
  the `theme-color` tags below; Android's splash stays white in dark
  mode for the half second it shows.
- `lib/login-code.ts` + test: cleans what you typed ("123 456" becomes
  "123456") and checks it's 6 to 10 digits.
- `lib/app-identity.test.ts`: short name fits (12 characters at most),
  the manifest lists 192, 512 and maskable icons and starts on "/".

Changed:
- `app/layout.tsx`: a `viewport` export (`viewportFit: "cover"`, and
  `themeColor` white for light, `#141414` for dark), `appleWebApp`
  (title "Meal Cost", status bar "default") and the icon links.
- `app/favicon.ico`: deleted (it's the Next.js triangle).
- `proxy.ts`: skip `.webmanifest` in the login check. Why: browsers fetch
  the manifest without your login cookie, so today the proxy would send
  that request to /login, Chrome would get a web page instead of a
  manifest, and the install would fall back to a generic icon and name.
- `components/ui/input.tsx`: 16 px at every screen width.
- `app/page.tsx`, `app/foods/page.tsx`, `app/recipes/page.tsx`,
  `app/recipes/[id]/page.tsx`, `app/settings/page.tsx`: bottom space
  includes the home bar.
- `components/undo-toast.tsx`: only if 5a is approved and the overlap is
  real.
- `components/login-form.tsx`, `lib/auth-actions.ts` (new
  `verifyLoginCode` action): the code step.
- `supabase/templates/magic-link.html`: shows the code. While I'm in it,
  its green (#2E7D4F) is the old one; I'd change it to matcha #4F6B2E.
- `lib/camera.ts`, `lib/camera.test.ts`, `components/camera-blocked.tsx`
  (if 5b): an "Android (installed app)" case with steps through Chrome:
  open Chrome, ⋮, Settings, Site settings, Camera, allow this site.
- `CLAUDE.md`: one line under Platform saying where the name and icon
  live.

Commits: (1) manifest, icons and meta tags; (2) safe areas and inputs;
(3) login code; (4) Android camera help.

## 6. How to test

On the laptop first:
1. `npm test`, `npm run lint`, `npm run build`. The build list should
   show `/manifest.webmanifest` and `/icons/[file]` as prebuilt.
2. `npm start`, then in a private window (logged out) open
   `localhost:3000/manifest.webmanifest`: it shows the manifest, not the
   login page. Open each `/icons/...png`.
3. Chrome DevTools, Application tab, Manifest: name, short name,
   colours and icons show, with no errors. The "minimum safe area"
   checkbox shows the bowl fits inside Android's circle.

On the iPhone, through the Vercel preview of the branch (https is
required, like for the camera):
1. In Safari, open the preview and log in. Share, then Add to Home
   Screen. The name says "Meal Cost" and the icon is the bowl. Add.
2. Open it from the home screen: no address bar, and you're already
   logged in (the one-time cookie copy).
3. Status bar: clock readable, bar matches the page. Switch the phone to
   dark mode (Control Centre) and check again.
4. Today: scroll to the bottom; the last item clears the tab bar. The
   tab labels sit above the home bar.
5. Log a recipe, swap it: the Undo message sits above the tab bar and
   doesn't cover the Scan button or the home bar. Open a bottom sheet:
   its buttons sit above the home bar.
6. Tap an amount field: the page doesn't zoom.
7. Scan: the close button is clear of the Dynamic Island; allow the
   camera if it asks.
8. Log out, then log in inside the app with the code. You land on Today.
9. Turn the phone sideways on Today, and on Scan: nothing under the
   notch, and the scanner's close and torch buttons are easy to tap.
10. Airplane mode, open the app: the phone's "no connection" page. Back
    online: it works.

On Android (if you have one or can borrow one): the preview's Vercel
password blocks the manifest (Chrome fetches it without your Vercel
login), so Chrome won't install it properly from the preview. Test it
on the live site after merging: Chrome, ⋮, Add to home screen, Install.
Check the icon isn't cut off, the splash, the status bar in light and
dark, the tab bar above the gesture bar, and that the email link logs
the app in.

Hand steps for you:
- Supabase dashboard: paste the new email template (Authentication,
  Emails, Templates, Magic Link). It applies to the live site at once,
  so live emails show a code the live app can't use until we merge.
  Harmless, but it's why I'd paste it when step 3 is on the preview.
- Same place, the Email provider settings: check "Email OTP Length" is 6.
- After the rename someday: edit `lib/app-identity.ts`, swap
  `components/app-icon.tsx`, update the email's "Meal Cost Tracker"
  line, then delete and re-add the icon on your iPhone.

Sources (iOS behaviour I couldn't check in code):
- iOS 17.2 copies Safari's cookies once when you add a web app:
  https://openpwa.net/reference/storage/home-screen-storage-isolation/
- Magic links opening in Safari, not the installed app:
  https://github.com/tootsuite/mastodon/issues/249
- iOS 26.1 shade over a translucent status bar:
  https://github.com/autobrr/qui/issues/2520
- Status bar styles and iOS 26 colour sampling:
  https://github.com/joe-bell/skills/blob/main/skills/apple-web-app/references/theme-color-and-status-bar.md
