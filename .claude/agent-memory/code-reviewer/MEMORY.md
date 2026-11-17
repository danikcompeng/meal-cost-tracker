# Code reviewer memory: Meal Cost Tracker

## Topic files
- [Code map](code-map.md) — where each feature's code + migration lives (cost, log, recipes...)
- [Decisions](decisions.md) — approved choices and won't-fix items per feature; don't re-raise
- [Deferred](deferred.md) — accepted issues with a "remind when..." trigger (purchases, price)
- [Review history](review-history.md) — every past review and its findings. Latest: 2026-11-17
  craft branch (OKLCH, surface-raised, icon strokes), Minor issues. Plan: plans/craft.md.
- Button states (commit 9): busy = disabled + focusableWhenDisabled (full colour); can't-use-now = also
  `data-unavailable={x || undefined}` (bg-muted grey). TW v4 variant order: hover < disabled < aria <
  data < custom (dark), so data-* beats plain/hover classes; numeric sort: h-11 beats size sm's h-7.
  New confirm/second buttons must get data-unavailable while the OTHER action runs.
- React 19.3 async transitions: setState AFTER an await is an urgent (Default lane) update and commits
  BEFORE isPending flips false (two commits). An effect keyed only on the error sees the busy UI still
  mounted. Form onSubmit runs before a function `action` (and on Enter); preventDefault there skips it.
  Next's action reducer calls resolve(actionResult) BEFORE the revalidated tree commits, so code after
  `await action()` renders against the OLD server props first.
- Early-return branches: a component rendered in both (UndoToast) at a different child index REMOUNTS
  (state + entrance animation lost). React renders data-x={false} as "false" (matches [data-x]).
- Framer drag release: y-locked gesture -> startAnimation skips x (no spring back); no-drag tap/cancel
  -> resumeAnimation only if this element's constraints were resolved (first onStart) and
  currentDirection (kept from the LAST gesture) allows x. Lock = 10 px, checks y first.
- Base UI focusableWhenDisabled: aria-disabled, onClick preventDefault (blocks click AND Enter implicit
  submit), keydown preventDefault on every key but Tab (also stops Esc closing a dialog from it).
  buttonVariants `disabled:` classes stop applying: style "can't use" vs "busy" by hand.
- Errors: validation failures return fieldErrors only (no message), so nothing is announced unless
  the form moves focus or adds an alert. role=alert present in the first HTML is usually not read.
- Focus rings (since commit 6): `focus-ring` / `focus-ring-inset` @utility in globals.css (solid 2 px
  var(--ring) outline). New buttons/links need one. Dark matcha ring on butter = 1.22:1 (never inset
  on a highlight fill); opacity on an element fades its outline too. `cn` = shadcn's "cn" package,
  tailwind-merge parity (README): later conflicting class REPLACES earlier (rounded-[calc] drops
  rounded-lg, h-11 drops h-7); unknown classes (focus-ring, surface-raised) pass through.
- Craft pass (2026-11-17): dark depth page #141414 < card #1F1F1F < popover #2A2A2A < raised #333.
  Every bg-popover needs surface-raised (dark --accent == --popover). surface-raised works only
  because @theme is `inline`. On raised: field-border 2.94:1, red tint button 3.99:1 (both fail;
  keep inputs/red buttons off tiles inside sheets). Button base is text-sm: icon strokes 1.32 px.
  Presets must be :root[data-accent] (vars resolve where declared). Tailwind scans .md files too.
- Input font rule: every text field must be >= 16 px at ALL widths (iOS zoom; iPad = md). New
  inputs/selects/textareas: check for text-sm or md:text-sm. ui/input.tsx is text-base.

## Quick facts
- No Bash in reviews: read files directly (no git diff); git status comes in the prompt.
- Migrations run by hand in the Supabase SQL editor; code reading a new column breaks prod if
  deployed first.
- foods.price is NOT NULL today; "no price yet" only becomes real with purchases.
- Next 16 + cacheComponents: dynamic params read via params.then inside Suspense is the
  documented pattern; revalidatePath in an action purges the whole client router cache.
- router.refresh() / navigation with no network: Next falls back to a full browser page load
  (render-tree.js "SPA navigation failed" -> MPA) unless experimental.useOffline. Offline = the
  browser's error page. Never refresh in a "no signal" catch. error.tsx retry() (Next 16.3+) =
  context.refresh(), so "Try again" offline hits the same trap.
- MotionConfig reducedMotion jumps motion-dom positionalKeys = width/height/top/left/right/bottom
  + ALL transforms (x, y, scale, rotate); never opacity or filter (blur).
- MotionConfig reducedMotion="user" exists only on Today and scan-flow: anything in app/layout.tsx
  gets NO reduced motion from Framer unless it handles useReducedMotion itself.
- Framer (motion-dom): MotionValue.stop()/jump() stop an animate(x) run and its .then NEVER
  fires; x.set() does NOT stop it. Pointerdown on a drag element stops its x animation.
  So "commit in .then + a latch" can get stuck; check for it.
- Framer drag (motion-dom VisualElementDragControls): onDragEnd also fires on pointercancel
  (browser took the scroll) and when dragDirectionLock locked "y"; PanInfo offset/velocity are the
  POINTER's, not the element's. Any "flick = commit" rule needs a lock-"x" check. onDragStart fires
  at 3 px (tap wobble). onDragEnd runs in postRender AFTER the snap-back started (and after a
  mouse click). MotionConfig reducedMotion jumps positionalKeys: x/y AND width/height.
- Framer press-to-stop: pointerdown on a drag element stops its x animation at once. If that touch
  ends in pointercancel before 3 px, NEITHER onDragEnd NOR React onPointerUp fires -> x stuck where
  it stopped. Any "settle on release" design needs onPointerCancel too. Drag's own release
  animation (animateMotionValue) ignores MotionConfig reducedMotion.
- Focus rings on coloured fills: ring-ring/50 (matcha) on bg-destructive is ~1.1:1, invisible.
  Check every new solid-colour button's focus-visible ring against its own fill.

- Client-side action failures (server-action-reducer.js): fetch TypeError (offline, OR the link
  dropped while the server was already running the action -> it may have SAVED); non-RSC reply
  (Vercel 5xx) -> Error; stale page after a deploy -> UnrecognizedActionError (action ids change
  per build; next/navigation exports unstable_isUnrecognizedActionError). Retrying never fixes that.
  lib/action-call.ts keepOnFailure wraps all form saves; login wraps in commit 5.
- Server action redirect("/") in Next 16: Next does an internal GET to "/" with the action's
  Set-Cookie merged in (action-handler.js getForwardedHeaders), so proxy sees new cookies.
- React 19 <form action>: after the action returns (even an error state) uncontrolled fields
  are RESET. Any "show error, keep what you typed" form needs defaultValue from state.
- auth-js errors: AuthRetryableFetchError status 0 (fetch failed) or 500-504/520-530; AuthUnknownError
  status undefined (non-JSON reply); wrong/expired OTP = 403 AuthApiError. signOut() global keeps the
  session on error; scope "local" deletes cookies FIRST (auth-js 2.119), even on a retryable refresh
  failure, then sends a revoke. App's Log out = local only (decided 2026-11-16, user's request).
  Server cookie writes go via ssr's SIGNED_OUT/TOKEN_REFRESHED subscriber -> setAll, inside the await.
- Same text in a role=alert after a retry = no DOM change = not re-announced; hide it while pending.
- Supabase signInWithOtp for a new/unconfirmed email sends the Confirm signup template, not
  Magic link. Only magic-link.html is in the repo.
- Email template width: content inside the card = viewport - 98 px (16 outer x2, border, 32 pad x2).
  Outlook desktop: no font inheritance into nested tables, max-width/border-radius ignored.
  Code text in the app (login-form, login-code-form) should match the email's wording/order.
- viewport-fit=cover is on (2026-11-15): any new FULL-WIDTH fixed/absolute element needs
  env(safe-area-inset-left/right) too (landscape notch); centred max-w-lg columns are safe.
  Tab bar ~68.5 px, Scan ring top 91.5 px: toast (6rem) and pb-above-tab-bar (7rem) depend on it.

- parseDecimal uses Number(): "0x10" = 16, "1e2" = 100, "1." = 1, "." = invalid. Pre-existing,
  raised once (polish 1) as out of scope. Intl rounds the exact double: 0.995 shows "0.99".
- Count words: new "N things" text must branch on 1 or use unitWord/amountText (lib/units.ts).
- Focus + iPhone (polish item 2): a tap never focuses a button, so Safari treats ANY later
  script .focus() as keyboard-like and draws a ring (blue if the element has no outline-none).
  Every .focus() after a tap (toast focusAfter, opener on close, Skip, Start over) can ring.
  BottomSheet: React autoFocus / child useEffect focus at open is a no-op (dialog still shut).
  showModal's pick = first focusable incl. tabIndex -1 (sheet title), or an HTML autofocus attr.

- Height maths (Tailwind v4, body 16px/1.5): text-[13px] inherits lh 1.5 = 19.5 px; text-sm 20;
  text-xl 28; text-5xl lh 1; Label leading-none 14 -> Field = 14+6+44 = 64. AppHeader title row is
  items-baseline (h1 37.5 + h-11 links) ~46 px, not 44. Skeletons: check per-state lines (min-h-5
  hints, empty-day text) and phone-width wrapping, not only desktop.
- aria-busy="true" on a live region (role=status) asks screen readers to hold its announcements.

## Patterns to watch
- Comments that promise behaviour of another function (e.g. "the hint flags it"): verify them.
  Repeated twice: "Framer reduced motion leaves height alone" (it jumps it; see Quick facts).
  Same for "change one, change the other" notes: check the OTHER file has the matching note.
- Postgres numeric arrives as string: Number()/numberOrNull at every new Supabase read.
- Null must propagate: no `?? 0` on price or nutrients; guard servings / package_size = 0.
- Swallowed errors: every new action/read must logDbError before returning a friendly message.
- Server actions that call throwing helpers must be wrapped in guarded(), or the throw escapes
  to error.tsx. Don't suggest redirect() inside guarded() (its try/catch would swallow it).
- Live hints computed on every keystroke flash for partial numbers (typing 2000 passes 2, 20).
- Rounding then re-scaling stored values compounds error; round only for display.
- Form validation vs DB column precision (numeric(p,s) rounding vs CHECK > 0).
- Async code that outlives its component: after every await (or animation .then), re-check a
  cancelled flag / card id before touching state or the router. Includes form callbacks
  (onSaved -> parent setSheet) after the sheet closed. Raised 4 times (camera, scan-flow,
  recipe-view, today-view, swap-stack fly-off): explain with a slow-network walk-through.
  Raised a 5th time 2026-11-15: page-level pending/error state (swapping, swapError) shared by
  every swap sheet, so a closed sheet's late result shows up in the next one. Tie state to `mine`.
  6th (polish 3): toast Undo in flight when a newer message replaces it -> error lost. Also any
  "had focus" read BEFORE an await is stale after it; re-check before moving focus.
- Undo toast now never times out (decision 2026-11-15): every toast needs a focusAfter target
  and its text can go stale; today-view.tsx spacer h-16 depends on the toast's height.
- Optimistic "hidden ids" sets: must be pruned against the server's list, or a lost reply leaves
  a real row invisible (and out of totals) until reload. Also check "already gone" isn't an error.
- Closures holding an index (onCommit -> goTo(index + 1)) go stale if the user acts mid-await.
- Base UI Button `disabled` = native disabled: a focused button that turns disabled while
  pending drops keyboard focus to <body>. Use aria-disabled + a guard (undo-toast.tsx does).
- Read-then-update server actions: put the checked conditions in the update's .eq() filters too,
  or a change landing between the read and the write is overwritten.
- Hiding the focused control (invisible / unmount) drops focus to <body>; move it on purpose.
- UI state derived from a live condition (open || hasError) flips back when it clears; latch it.
  Latches that never reset (restarted=true, flyingId) misfire later: check every latch has a
  reset path, especially when the user can go BACK to the item that set it.
- A saved value the old rules FORCED isn't the user's choice (hydration false on non-ml food).
- <dialog> + React: React removes the element before close(), so focus isn't restored;
  bottom-sheet.tsx handles it, new dialogs must too. Esc/backdrop/X should respect `pending`.
- NOT NULL migrations: old live code may still write null between SQL and deploy.
- Shared error wording ("or leave it blank") reused for a field that is now required.
- Manual backfills in the SQL editor bypass RLS: always scope them by id/user.
- Errors shown far from the control that caused them (unit-lock under Package size).
- User-facing text that claims a position or cause ("so it's further down") must hold for
  every key order; check it against a counter-example (swap cost-unknown card ranked 1st).
- Every "—" on screen needs a "who's missing it" line, not only the ones that rank (kcal).
- Supabase returns max 1,000 rows by default: any read without .limit() that feeds "never" /
  "60+ days" claims can silently truncate.
- Help text naming screen positions ("top right") or things the user can't see (the web
  address inside an installed app): Chrome Android can put its address bar at the bottom.
- Developer responds well to concrete worked examples (rice test); keep using them.
