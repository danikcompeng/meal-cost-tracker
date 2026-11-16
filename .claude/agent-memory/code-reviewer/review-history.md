---
name: review-history
description: Past code reviews of Meal Cost Tracker features (date, verdict, what was raised) - check before re-raising a finding
metadata:
  type: project
---

- 2026-11-07 lib/cost.ts: 1a/1b/3a fixed, verified. Looks good.
- 2026-11-09 rename ingredients -> foods: Minor issues, fixed same day except 3d.
- 2026-11-09 macros on foods: Minor issues (unit-note clearing, segmented track invisible,
  36px segments, calorieHint comment 20% vs 25%).
- 2026-11-09 daily food log: Minor issues (rounded-snapshot drift, throws -> error.tsx, stale
  day past midnight, "1,000" -> 1, unlogged getRecentFoodIds error). Since fixed.
- 2026-11-09 0 kcal fills blank macros: Looks good / minor (comment vs calorieHint, tests).
- 2026-11-11 daily targets: Minor issues, matches plan. RLS/upsert/CHECKs correct, no null->0.
  Raised: run 006 BEFORE pushing; low-calorie note flashes while typing 2 -> 2000; 20% boundary
  test missing; page fn `Targets` shadows type name; header at 320 px unsure.
- 2026-11-11 barcode scanning: Minor issues, matches plan. Security clean (re-validated input,
  RLS-scoped lookup, digits-only OFF URL). Raised: run 007 first; test on a branch preview; X
  during "Looking up" then "mine" still router.replace()s; no cancelled check after await
  video.play(); typed 8-digit UPC-E saved as 8 digits (dup later); some errors unlogged; ?log=
  remount race (accepted, see Deferred); found result is a full page, not the plan's panel.
- 2026-11-11 more nutrients: Minor issues. validateMacros, fill rule, 008 backfill, RLS, null
  handling correct. Raised: run 008 first; "More nutrients" open derived from hasError collapses
  mid-typing (latch it); water 0s alone show extras grid; "Blank macros" hint about folded boxes;
  sodium "1,170" refused as ambiguous.
- 2026-11-11 rings + hydration (uncommitted): Minor issues. Ring SVG, disclosure (button outside
  the click wrapper, inert, cookie), 009 order/regex/check, scaleSnapshot water, "<" rules fine.
  Raised: editing a g food to ml shows the switch OFF (saved false was forced, not chosen) =
  the plan's Water g->ml step; plan's one-line Water-entries backfill SQL not written anywhere
  (SQL editor bypasses RLS, scope by food id); run 009 first; 4 x 56 px rings in 53 px columns
  at 320 px; amountText "0 g" for 0.001-0.004 amounts; summary.ts:82 duplicates totalNumber "<1".
- 2026-11-11 duplicate foods (commit 30577b4, unpushed): Minor issues. Verified submitter
  name/value reaches the action (react-dom uses new FormData(form, submitter); Base UI Button
  passes type/name/value). Raised: Update replaces a DIFFERENT existing barcode silently (scan
  ping-pong); Esc/backdrop still cancel while pending; update also overwrites name/brand
  spelling (plan says numbers only); comment claims focus returns to Save (it doesn't, same
  reason as bottom-sheet.tsx); optional: render dialog after Save so it's never the default
  button; getFoodsNewestFirst duplicates getFoods.
- 2026-11-11 water goal 2,000 ml + show_water switch (commit e9757d6, unpushed): Minor issues.
  010 order/transaction/CHECK/RLS fine; getTargets no-row/old-row fine; hidden goal box still
  submitted (hidden != disabled); no leftover null-water code. Raised: deploy right after 010
  (old live code upserts water null -> NOT NULL fails for first-time savers); water "-5"/"abc"
  error says "or leave it blank" (blank is refused); calorie hints vanish while water box is
  blank (preview.ok false); stale server water error reappears after off -> reset -> on;
  010 re-run errors on add column (use if not exists; safe anyway); fieldset/legend so screen
  readers hear "water" with "Daily goal"; missing showWater field = off (maybe !== "false");
  showsWater() is now a one-line wrapper.
- 2026-11-14 recipes step 2 (uncommitted: Kitchen switch, list, recipe screen, ingredients):
  Minor issues. sumOrNull "—" rule, upsert + RLS, delete/unit lock, uuid guard, no null->0 all
  correct. Raised: closing the Add sheet while "Adding…" -> onSaved setSheet re-opens it (or
  replaces another sheet); Remove not disabled while saving (remove then upsert re-adds it);
  unit-lock error shows under Package size, far from "Measured by", and stays after switching
  back; Kitchen pill ~98 px in a 96 px column at 320 px (check); nits: per-serving maths
  recomputed in 3 components, usedInRecipesMessage in recipe-totals.ts, FK code const in 2
  files, /recipes loads all foods for hasFoods. Future: toFood Number(price) when price nullable.
- 2026-11-14 recipes step 3 (uncommitted: logging recipes from Today): Minor issues. logRecipe
  re-reads recipe, empty-recipe guard, null propagation, water, unit 'serving', 011 checks/RLS,
  servings cap on log + edit, tests all correct. Raised: onDone after closing the sheet closes a
  sheet opened since (3rd time; suggested identity check setSheet(s => s === mine ? null : s));
  "no price yet per serving" wording; focus drops to <body> on recipe pick (no autoFocus, on
  purpose for one tap: suggest a comment + focus the name/Log it); nits: LogFoodForm back says
  "All foods", option button classes duplicated, `grouped` ignores onPickRecipe, Today now errors
  if getRecipes fails (optional fallback).
- 2026-11-14 swap step 1 (uncommitted: lib/swap.ts ranking, daysBetween, getEatenHistory in
  entries.ts): Minor issues. Group order, 15% EPSILON, cents chips, id tie-break, servings
  scaling all correct. Raised: cost-unknown note "so it's further down" false when that recipe
  ranks 1st (cost is key 3); kcal "—" never says who's missing it (no kcalMissing); 1,000-row
  Supabase cap can drop old recipe rows -> false "Not had it in 60+ days"; current-unknown
  protein = tie but current-unknown cost still sinks unknowns (inconsistent, plan says tie for
  both); "Not a close match: ..., $0.62 cheaper" repeats the chip; CLAUDE.md "uses the most
  ingredients" vs "fewest to get" (toGet is fine-grained, cost rarely decides); no cost-band
  boundary tests; SwapCurrent.recipeId unused; localeCompare locale; swap-card.tsx untracked
  outside step 1; no servings > 0 guard (0 -> "Same cost" for all).
  Re-check same day: all fixed and tested (1c entries.ts split moved to step 2). OK to commit.
  Nits left: RankedSwap.notes doc still says "why it's lower"; CLAUDE.md:27 "uses the most
  ingredients" still differs from "fewest to get" (developer's own wording, their call).
- 2026-11-14 swap step 2 (uncommitted: swap-sheet/stack/card/empty/button, recipe-view, page,
  getEatenHistory): Fix before committing. Verified fine: .limit() returns `this` so .not after
  it works; 60/7-day ranges; null on error/limit; leaving-ref guard vs swipe+tap; listener
  cleanup; Value "—"+sr "unknown"; label-in-name; overflow-x-clip maths; MotionConfig on Today.
  Raised: pointerdown on the flying card stops x's animation, .then never fires -> leaving stuck,
  dead stack (verified in motion-dom); Back mid-flight -> x.set doesn't stop it, stale index
  skips forward 2; close mid-flight still router.pushes (4th "outlives component"); flick
  against the drag side commits (offset +90, velocity -800 -> skip); Back to card 1 hides the
  focused Back (focus lost); restarted latch moves focus on Back-from-end; reasons before the h3
  (heading nav skips chips); dark mode --card == --popover so the card is invisible in the
  sheet; Open it gives no pending feedback (prefetch); e.repeat; nits: kcal change missing vs
  plan, proteinPerDollar formatting duplicated, pickLabel === "Open it" coupling, touch-pan-y
  redundant, CLAUDE.md still says carousel, step 3 needs a "pick failed" path.
  Re-check same day: all fixed (flyingId state + drag false, topId ref, jump(0), stop on
  unmount, same-side flick, prefetch + useTransition "Opening…", goTo flushSync + focus Skip,
  e.repeat, borders, h3 first + order-first, id-based top card, memoized current). Verified
  drag "x" -> false only calls controls.stop() which no-ops when not dragging. One new bug:
  flyingId is never cleared, so Back to the card you just skipped leaves it undraggable
  (pointer-events-none). Fix: setFlyingId(null) in the .then. Rest OK to commit.
- 2026-11-15 swap step 3 (uncommitted: swapEntry/undoSwap, validateUndoSwap, undo-toast, two-button
  entry row, ids.ts): Minor issues. Verified fine: snapshot from live recipe incl. amount/unit/name;
  update+select("id") catches 0 rows under RLS; undo .eq(recipe_id) guard; validateUndoSwap types,
  nulls, water, trim/100 = DB check, meal+servings unchanged; double tap (leaving ref), double Undo;
  edit->swap focus (cleanup focuses row before the swap sheet records opener); always-mounted status
  box; row key recipe+name; MotionConfig fades. Raised: swapping/swapError shared across sheets
  (close mid-swap: failure silent, next sheet shows "Swapping…" + old error; 5th "outlives");
  Swap/Skip `disabled` while pending drops keyboard focus (toast already knows aria-disabled);
  read-then-write gap (undo can leave amount 2 with 1.5's snapshot; add .eq amount/meal; comment
  overclaims); lost response -> retry says "already have"; iOS VoiceOver may not set activeElement
  (hadFocus, timer pause) - unsure; stale error under the next card (clear via onTop); Undo button
  kept after UNDO_CHANGED; two toasts overlap 200 ms; SWAP_FAILED/UNDO_FAILED duplicated.
  Re-check same day: all fixed (swapStatus tied to sheet, .eq amount/recipe_id/meal filters,
  focusableWhenDisabled, onTop by id, final Undo errors, mode="wait"). New: router.refresh() in
  the no-signal catch -> Next falls back to a full page load when the RSC fetch fails (verified
  render-tree.js exitStatus 2; experimental.useOffline is off) = offline browser error page;
  refresh only after a server answer. Also success does setSwapStatus(null) unconditionally,
  wiping another sheet's pending/error (use s?.sheet === mine). Rest OK.
- 2026-11-15 PWA step 1 (uncommitted: manifest, icons route, meta tags, proxy matcher): Minor
  issues, no bugs. Verified fine: ImageResponse prod cache-control is max-age=0 must-revalidate
  (no stale-icon risk); generateStaticParams in route handlers + unknown params at runtime = 404;
  maskable 0.56 square corners at 39.6% < 40% safe circle; matcher test regex ~ Next's (Next only
  adds optional _next/data prefix / .rsc suffix); vitest picks up root proxy.test.ts. Raised:
  globals.css --background/--primary lack the back-pointer to app-identity.ts the plan promised;
  layout.tsx re-implements iconByFile with `!`; manifest.webmanifest + favicon.ico in the matcher
  duplicate the ending rules (fine, just say so); optional comment on why 0.56.
- 2026-11-15 PWA step 2 (uncommitted: viewport-fit cover, @utility pb-above-tab-bar on the 5
  TabBar screens, input 16 px, toast bottom 6rem): Minor issues, no blocking bugs. Verified: only
  5 TabBar screens, no pb-28 left, every input/select >= 16 px, sheets/panels/pages are centred
  max-w-lg (safe in landscape), toast/padding maths hold with inset. Raised: scanner top bar
  (close/torch) is full-width px-4 -> under the notch in landscape (needs inset-left/right);
  plan's "browser tab looks the same" not quite (Safari tab bar lifts when toolbar collapses,
  unsure); 12 dead md:text-base overrides; Scan button size <-> toast 6rem/7rem needs a pointer.
- 2026-11-15 PWA step 3 (uncommitted: login code, verifyLoginCode, login-code-form, key remount,
  email template {{ .Token }}): Minor issues, no blocking bugs. Verified: action redirect("/") ->
  Next's internal GET to "/" with Set-Cookie merged into the cookie header (getForwardedHeaders),
  so proxy sees the session; cookieStore.set works in actions; key remount resets useActionState;
  hidden email tamper = same as Supabase's public /verify (8 digits, 1 h, rate limit); template
  syntax + link unchanged. Raised: code step lives only in React state, so an iOS reload or a
  60 s resend 429 strands you with a valid code and no field; React 19 resets the form after an
  error (8-digit code wiped); focus drops to <body> on both step changes, error not announced;
  ?error=link banner returns after "Use a different email"; Start over not guarded while pending;
  brand-new emails get Confirm signup template (no code); nits: logAuthError still duplicated in
  auth/confirm/route.ts, plan heading "6-digit", page subtitle "email you a link", long email
  overflow at 320 px.
  Re-check same day: all fixed ("I already have a code", controlled inputs, aria-disabled Start
  over, autoFocus, describedby, role=alert, auth-log.ts). Left: 429 on send also covers the
  hourly/IP caps, so "We just sent you one" can be untrue; server email error not cleared by
  typing; pwa.md:158 "I'll check yours says 6". OK to commit.
- 2026-11-15 PWA step 4 (uncommitted: android_home_screen Platform + STEPS entry): Minor issues, no
  code bugs. Verified: display-mode standalone matches a WebAPK (manifest display "standalone"),
  test covers both, Other list = 4 entries in phone order. Raised: step 3 asks for "this app's web
  address" in the one mode with no address bar (show location.host); "(top right)" wrong when
  Chrome's address bar is at the bottom; Samsung Internet / Firefox installs told "Open Chrome";
  site page may be a Camera switch not "Allow" (unsure, check on a phone); global Camera switch off
  = nothing under Blocked; "Other phone?" label now also lists your phone's other mode.
- 2026-11-15 polish item 1 (uncommitted: unitWord / unitWordForTyped in units.ts, amount-field,
  recipe-form "Makes"): Looks good, no bugs. Verified: singular = amountFormat (2 dp) shows "1";
  comma decimals, "1,000" ambiguous -> plural, blank -> placeholder, junk -> plural; no other fixed
  plural after a number in components/app/lib (day-totals, food-manager, swap-empty, kitchenReason,
  lastHadText all branch; swap.ts:309 only runs at >= 3 days). Raised: "1." is singular in code
  but the plan says plural, comment at units.ts:65 reads ambiguously, no test for "1." / ".";
  optional swap-card.tsx:25 exact `servings === 1`; out of scope: parseDecimal takes "0x10"/"1e2".
- 2026-11-15 polish item 2 (uncommitted bottom-sheet.tsx: title tabIndex -1 + focus after showModal,
  x gets outline-none focus-visible ring): Minor issues, no bugs in the file. Verified: child
  autoFocus/useEffect focus runs while the dialog is shut (no-op), StrictMode open/close/open keeps
  the opener, Escape/Tab/return-focus unchanged, no sheet worse off on the title. Raised: same
  Safari ring cause elsewhere (toast focusAfter -> shuffle button entry-row.tsx:76 has no
  outline-none, opener.focus() on close; undo-toast.tsx:82 "a tap doesn't draw a ring" contradicts
  item 2); comment 35-41 overclaims (title is now showModal's own pick, probably; "deliberate
  choice" can't exist at open); dead autoFocus at open: recipe-form.tsx:50 always, log-food-form
  on ?log=; working tree: today-view.tsx:178 focusAfterUndo vs Toast.focusAfter (build fails;
  item 3 WIP, commit bottom-sheet.tsx alone).
- 2026-11-15 polish item 3 (uncommitted undo-toast.tsx: no timer, × Dismiss, focusAfter only if focus
  was in the message; today-view h-16 spacer): Minor issues. Verified: lifetime (× / Undo success
  id-guarded / new id key / TodayView key remount per day), × aria-disabled while undoing, dismiss
  hadFocus read before setState, DOM order = message after snack, before tab bar; rename complete.
  Raised: Undo in flight when the message is replaced/unmounted -> failure silent (6th "outlives",
  likelier with item 4 deletes; report from TodayView.undo like pickSwap's closed-sheet toast);
  hadFocus read only before the await (re-check focusIsHere() after); final problem sends focus to
  the row although × + error stay (focus ×); "Couldn't swap" toast has no focusAfter (× drops focus
  to body); spacer h-16 fine for 1-3 lines, short at 4+ (long name at 320 px, Undoing… narrows text
  ~30 px), 4rem jump on dismiss at bottom; no back-pointer from undo-toast 6rem to the spacer;
  plans/swap.md:164 still "10 seconds"; message now persists stale after editing that entry.
  Re-check same day: 1a-1e, 3a, 3b fixed (shownToast ref + reportLostUndo, focus check after await,
  final -> × ref, focusSwapButton helper, h-20 fits 4 lines). Not taken (to notes.md Polish later):
  spacer jump on fade-out, Undoing… reflow, stale text (3c). New, small: lost-undo toast says
  "Couldn't undo. Please try again." with no Undo and no meal named, no focusAfter; it REPLACES the
  newer message (and its Undo: matters for item 4 deletes); optional: read focusIsHere() right after
  the await, before setState. OK to commit after the wording/focusAfter tweak.
- 2026-11-15 polish item 4 (uncommitted: swipe-to-delete in entry-row, hidden ids in today-view,
  deleteEntry .select, restoreEntry + validateRestoredEntry): Fix before committing. Security clean
  (insert object rebuilt from validated keys only, no user_id, RLS; every 004/008/009/011 check
  covered; id/created_at choice = raw-API equivalent; 23505 oracle negligible). Verified in
  motion-dom: stop() -> startAnimation -> postRender(onDragEnd), so jump/stop/animate replace the
  snap-back; MotionConfig reduced motion makes height jump (positionalKeys). Raised: onDragEnd
  fires on pointercancel and for y-locked gestures with POINTER offset/velocity -> a diagonal
  scroll flick can delete (use onDirectionLock "x" + ignore pointercancel); onDragStart at 3 px
  suppresses wobbly taps; keyboard Enter after a mouse drag suppressed (e.detail 0); swipe "doesn't
  exist anymore" flashes row back; hidden ids never pruned (lost restore reply + × = invisible
  row); lost-undo still replaces a newer delete's Undo, no retry; meal-section comment says
  MotionConfig leaves height (wrong); last row in a meal has no exit (ul unmounts); edit form
  message precedence hides delete error; closed-sheet delete toast no focusAfter; first-use
  return unmounts toast; tests for dropped user_id. swap-stack has the same pointercancel flick.
  notes.md still had NO "Polish later" section (item 3's three items missing).
  Re-check same day: 1a/1b (sideways ref via onDirectionLock, pointercancel, detail 0), 1c (gone),
  1d (entriesSeen render-time prune), 1e (retry message keeps Undo), 1g, comment, tests: all OK.
  Left: sheet path hides AFTER the await, so if the delete's fresh list lands first the id is
  added after pruning and a later lost-reply restore stays hidden (narrow; hide before await);
  the retry message still replaces a newer one's Undo (to Polish later); showAlreadyDeleted's
  router.refresh duplicates deleteEntry's revalidatePath. To Polish later per coordinator:
  swap-stack flick, 1f, last-row exit, first-use toast, VoiceOver activeElement. OK to commit.
- 2026-11-15 polish item 5 (remove 12 md:text-base from Input classNames): Looks good, no findings.
  Verified: ui/input.tsx text-base with no breakpoint override; zero md:/sm:/lg:text- left in
  components/app; the 12 lines read clean; food-form unit <select> text-base; login code Input
  text-lg; no textarea / custom select / font-size in globals.css; ui/ is only button/label/input.
  Couldn't diff (no Bash), so "nothing else touched" = current lines look right, not a diff check.
- 2026-11-16 polish item 4b (uncommitted: swipe-to-REVEAL like iPhone Mail; lib/swipe.ts restsOpen,
  entry-row open/settle/inert Delete, meal-section openRow, today-view openRow + capture pointerdown /
  scroll / Escape, rowDelete): Minor issues, no blocking bugs. Verified in motion-dom: object
  constraints rebased to [-88, 0], elastic {left .1, right 0}; release = inertia v0 (momentum off)
  then postRender onDragEnd -> our animate replaces it; double settle (onDragEnd + open effect) always
  agrees; window-capture PanSession pointerup (resumeAnimation) runs before React onPointerUp, so the
  tap settle wins; drag release ignores MotionConfig reducedMotion (animateMotionValue) but settle
  jumps anyway; exiting row keeps stale open=true (AnimatePresence old element) so no snap-back while
  sliding off; inert boolean OK in React 19.3; contrast 5.98 / 6.76 confirmed vs globals.css; scroll
  listener only exists while a row is open (not during the opening swipe), window is the scroller.
  Raised: press during a settle then pointercancel before 3 px (long-press, Chrome slop) -> no
  onDragEnd/onPointerUp -> row stuck mid (add onPointerCancel settle); matcha ring/50 on red ~1.1:1
  (invisible focus on Delete; use ring-primary-foreground); Escape (or Tab away) with focus on Delete
  -> inert drops focus to body / row stays open for keyboard; swipe starting on the red button
  doesn't move the row (unsure if a click can fire: phone test); today-view:257 comment says swipe;
  plan "Order and commits" has no 4b commit line.
  Re-check same day: all fixed (onPointerCancel settle, focusin + Escape focus-to-row, white/near-black
  ring, phone-test line, comment, commit line). focusin can't fight a mouse open (listener only exists
  after release; mousedown focus lands inside), focusLater/sheet title (setOpenRow(null) is batched
  with them, cleanup runs first; a sheet's title focus only closes, which is right). OK to commit.
- 2026-11-16 states commit 1 (uncommitted magic-link.html: code first, button second; plan
  plans/states-a11y.md): Minor issues, no bugs. Verified: .Token/.TokenHash/.RedirectTo correct,
  links unchanged (caller checked bytes), bgcolor on td, cleanLoginCode strips spaces/dashes,
  contrast of new text fine (#1a1a1a on #F0F0F0, #4a4a4a, white on #4F6B2E 6.0:1). Raised: 8 digits
  at 36px + 0.15em ~205-216 px + 32 tile pad vs W-98 px space -> overflows at 320 px (fits 360+),
  10 digits overflows at 375; laptop test shows "{{ .Token }}" so can't confirm width; Apple Mail
  may turn the 8 digits into a blue phone link (unsure, x-apple-data-detectors); Outlook desktop
  doesn't inherit td font into nested tables (Times), em letter-spacing unsure, preheader lacks
  mso-hide:all; #8a8a8a fallback 3.45:1 + #9a9a9a footer 2.6:1 fail (likely pre-existing);
  "Use the button or the code... Each works once" order + implies two uses; app login screen still
  link-first ("Check ... for a login link", "Email me a login link"); login-code.ts:1 quotes stale
  "Or type this code in the app".
- 2026-11-16 states commit 2 (uncommitted: skeleton.tsx Skeleton/TextLine/FieldShape, Today/Recipe/
  Foods/Settings/Login skeletons, "Deleting…"): Minor issues, no code bugs. Verified heights: Settings
  556 vs 555, Login 184 exact, Today folded tile 452 vs 450.5, field 64, segmented 80, v4 classes
  (size-13, h-15, h-3.5) valid, no digits while loading. Raised: aria-busy="true" on the role=status
  tells screen readers to hold its announcements (drop it); past days (?day=) have NO rings at all ->
  skeleton ~197 px too tall (comment says "a little"); Foods skeleton lacks the two min-h-5 hint lines
  (nutrition hint, "= $/100 g") -> ~63 px short; empty day's "Nothing logged yet" line (2 lines on
  phones) missing; recipe extras line wraps to 2 on 375-393 px; ingredient row 63.5 not 56+4; food
  row ~120 on phones (macro line wraps), not 96; AppHeader row ~46 px not 44 (baseline, estimate);
  recipe tile 91 vs 88; "Deleting…" widens the confirm group (name column ~52 px at 320), Cancel
  during a delete cancels nothing; commit 9's h-11 buttons will widen it more.
- 2026-11-16 states commit 3 (uncommitted: lib/action-call.ts keepOnFailure + noConnectionMessage/
  tapAgain, 9 callers wrapped, swapHeaderNotes historyLoaded): Minor issues, no blocking bugs.
  Verified: every wrapped action returns FormState/TargetsFormState (all fields optional but ok), so
  `as Result` is sound today; every caller renders its message and only runs onDone/onSaved/setFields
  on ok; no missed callers (login = commit 5, today-view catches itself); unstable_rethrow browser
  build rethrows redirect errors; per-submit wrapper fine. Raised: stale page after a deploy ->
  UnrecognizedActionError shown as "Couldn't reach the server. Check your connection" forever (use
  unstable_isUnrecognizedActionError, reload message); dropped link mid-action = saved but message
  says not reached -> "tap Log it again" logs twice (logFood/logRecipe/createRecipe); constraint lets
  {ok:true,...}-only types through (test line 30 shows it); wording differs from plan ("Couldn't
  save: no connection") and from Today's offline "Couldn't delete. Please try again."; entry-actions
  .ts:3 and recipe-actions.ts:3 headers still say guarded covers a lost connection; ingredient-form
  state.message hides removeError (commit 7 only names the edit sheet); historyLoaded default true;
  small: duplicate-dialog Keep both offline says "tap Add food again", targets "Saved" + error.
- 2026-11-16 states commit 4 (uncommitted: error.tsx tab bar + retry, not-found.tsx, offline-strip.tsx
  in layout, day-rollover/timezone-sync wait for "online"): Minor issues. Verified: retry stable since
  16.3 (installed 16.4.5) = startTransition(context.refresh + reset); usePathname fine in error.tsx;
  root not-found renders in root layout, metadata export supported, proxy sends logged-out to /login
  first; uSES server snapshot true = no mismatch; scanner fixed inset-0 paints over the strip; only
  fixed full-screen element. Raised: "Try again" offline = router.refresh -> full page load -> phone's
  no-internet page (guard with the online store); keepOnFailure afterDrop (commit 3, committed)
  refreshes exactly when the signal is gone, same trap; strip is in flow so it scrolls away / shifts
  content (plan says "under the status bar"); comment "height can't be skipped by reduced motion" wrong
  (2nd time; real reason: no MotionConfig at root); TimezoneSync offline branch skipped under dev
  StrictMode (cookie already saved on 2nd run); wording "until you're back" + loading also fails;
  not-found shows tabs on /login/x; `loggedIn` name.
- 2026-11-16 states commit 5 (login: auth-actions verify 0/5xx message + signOut local fallback,
  log-out-button.tsx, login wording/enterKeyHint, login metadata): Minor issues, no blocking bugs.
  Verified: wrong/expired code = 403 AuthApiError, never 0/5xx; local fallback removes cookies via
  SIGNED_OUT -> ssr setAll, redirect after OK; keepOnFailure rethrows the redirect (reducer rejects
  with getRedirectError); header server->client import fine; label/hint clear; alerts never coexist.
  Raised: log-out error box (absolute, ~3 lines, w-56, no border, no dismiss) covers DayNav next
  arrow / "Back to today" / KitchenSwitch right tab and stays after reconnect; identical repeat
  message not re-announced or visibly changed (hide while pending); native disabled on Log out drops
  focus on failure; sendMagicLink/verify drop could use checkFirst; 0/5xx comment "never checked"
  not guaranteed (504/timeout); local fallback re-sends a revoke (2x wait); plan wording differs
  (code's is better); question: global sign-out logs the iPhone app out from the laptop.
- 2026-11-16 states commit 6 (focus-ring / focus-ring-inset @utility in globals.css, Button/Input, ~28
  components): Minor issues. Verified: utilities layer beats base `* outline-ring/50`; Base UI + shadcn
  css + tw-animate ship no outline rules; `cn` pkg keeps unknown classes; aria-invalid:ring-3 is a
  box-shadow (independent); focusableWhenDisabled = aria-disabled (ring still shows); no clipping
  anywhere (sheet px-4/pt-1+, swap clip px-4, more-nutrients exactly 4 px, day-nav ring reaches x=0);
  only scanner + swipe Delete left on purpose. Raised: inset ring on the BUTTER option in dark mode =
  1.22:1 (segmented control: Tab always lands on the checked = butter option; kitchen switch current
  page); neither track clips, p-1 = 4 px fits focus-ring; aria-disabled:opacity-50 fades the ring to
  ~2.2:1 (Swap "Swapping…", Skip, Back, toast x); segmented copies ring values by hand (suggest
  focus-ring-within utility); test step 5 "taps show no ring" fails for inputs and script focus after
  taps (SwapEnd Start over, Skip, duplicate Cancel), now solid not faint; Mac Safari Tab skips buttons.
- 2026-11-16 states commit 7 (role=alert on every form message, errorId + aria-describedby, setAside
  one-slot in edit-entry + ingredient-form, focusableWhenDisabled on busy buttons, focus restore after
  failed delete): Minor issues. Verified: setAside walk-through (save err, delete err, save, delete
  same err) right every time (results are fresh objects, keepOnFailure too); onSubmit runs before the
  action (SimpleEventPlugin before FormActionEventPlugin) and on Enter; Base UI onClick preventDefault
  blocks click + implicit submit while busy; nothing else uses disabled:/data-disabled. Raised:
  food-row focus restore never fires (Yes stays mounted while deleting; error set in an urgent commit
  BEFORE isPending flips; deps need `deleting`); field-error-only failures announce nothing (no
  message); food-form barcode/measuredBy/macros + login email alerts not hidden while pending;
  OFF macros alert live while typing; duplicate dialog buttons still native disabled; ?error=link
  alert present at load (likely not read); "can't use" buttons (Remove while saving, Save while
  deleting) now full colour (commit 9); edit-entry Delete not blocked while saving; Edit recipe sheet
  has 2 message lines; nits: setSetAside name, duplicated block, hard-coded email-error/code-error.
