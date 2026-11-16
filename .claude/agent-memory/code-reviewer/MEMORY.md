# Code reviewer memory: Meal Cost Tracker

## Topic files
- [Code map](code-map.md) — where each feature's code + migration lives (cost, log, recipes...)
- [Decisions](decisions.md) — approved choices and won't-fix items per feature; don't re-raise
- [Deferred](deferred.md) — accepted issues with a "remind when..." trigger (purchases, price)
- [Review history](review-history.md) — every past review and its findings. Latest: 2026-11-15
  polish item 3 (Undo message stays, × Dismiss), Minor issues. Polish plan: plans/polish.md (5 items).

## Quick facts
- No Bash in reviews: read files directly (no git diff); git status comes in the prompt.
- Migrations run by hand in the Supabase SQL editor; code reading a new column breaks prod if
  deployed first.
- foods.price is NOT NULL today; "no price yet" only becomes real with purchases.
- Next 16 + cacheComponents: dynamic params read via params.then inside Suspense is the
  documented pattern; revalidatePath in an action purges the whole client router cache.
- router.refresh() / navigation with no network: Next falls back to a full browser page load
  (render-tree.js "SPA navigation failed" -> MPA) unless experimental.useOffline. Offline = the
  browser's error page. Never refresh in a "no signal" catch.
- Dark mode: --card == --popover == --muted (#1F1F1F). A bg-card tile inside a BottomSheet
  is invisible in dark mode; it needs a border or bg-accent.
- Framer (motion-dom): MotionValue.stop()/jump() stop an animate(x) run and its .then NEVER
  fires; x.set() does NOT stop it. Pointerdown on a drag element stops its x animation.
  So "commit in .then + a latch" can get stuck; check for it.

- Server action redirect("/") in Next 16: Next does an internal GET to "/" with the action's
  Set-Cookie merged in (action-handler.js getForwardedHeaders), so proxy sees new cookies.
- React 19 <form action>: after the action returns (even an error state) uncontrolled fields
  are RESET. Any "show error, keep what you typed" form needs defaultValue from state.
- Supabase signInWithOtp for a new/unconfirmed email sends the Confirm signup template, not
  Magic link. Only magic-link.html is in the repo.
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

## Patterns to watch
- Comments that promise behaviour of another function (e.g. "the hint flags it"): verify them.
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
