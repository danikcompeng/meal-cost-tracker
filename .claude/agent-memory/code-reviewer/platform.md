---
name: platform
description: Verified Next.js 16, React 19, Supabase/auth-js behaviour that Meal Cost Tracker reviews relied on (offline refresh trap, action failures, form reset, sign-out)
metadata:
  type: reference
---

Next.js 16
- cacheComponents: params.then inside Suspense is the documented pattern; revalidatePath in an
  action purges the whole client router cache.
- router.refresh()/navigation with no network -> full browser page load (render-tree.js MPA
  fallback) unless experimental.useOffline: offline = browser error page. Never refresh in a
  "no signal" catch. error.tsx retry() = context.refresh(), same trap.
- Client action failures (server-action-reducer.js): fetch TypeError (offline, or link dropped
  mid-action -> may have SAVED); Vercel 5xx -> Error; stale page after deploy ->
  UnrecognizedActionError (unstable_isUnrecognizedActionError). lib/action-call.ts keepOnFailure.
- Action redirect("/"): internal GET with the action's Set-Cookie merged (getForwardedHeaders).
- Action reducer resolves BEFORE the revalidated tree commits: code after `await action()` sees
  OLD server props first.
- cacheComponents keeps visited pages in React Activity: hide = display:none + effects destroyed
  (layout + passive, refs detached), show = effects re-created, state/refs kept. So Undo toast,
  form answers, open sheets survive leaving a page. A transformed ancestor (DaySlide/KitchenSlide
  mid-slide) becomes the containing block for `position: fixed` children (UndoToast in TodayView).
- Activity keeps up to 3 routes (docs 02-guides/preserving-ui-state.md; useRouter().bfcacheId key
  resets on push). Believed (unverified) that /foods and /foods?new are separate entries -> both
  mounted -> duplicate DOM ids (label for=, aria-labelledby resolve to the first in the document).
- Dev StrictMode (on by default in App Router) double-invokes effects of fresh mounts: one-shot
  reads in layout effects (kitchenNote, lastDay) are used up by the first run (unsure if it hides
  the slides under next dev; plan recordings use next start).

React 19.3
- setState AFTER an await in a transition = urgent update, commits BEFORE isPending flips false.
- Form onSubmit runs before a function `action` (and on Enter); preventDefault skips it.
- <form action>: after it returns, uncontrolled fields RESET; keep values via defaultValue/state.
- Early-return branches rendering the same component at another child index REMOUNT it.

Supabase / auth-js 2.119
- AuthRetryableFetchError status 0 or 500-504/520-530; AuthUnknownError status undefined; wrong
  OTP = 403 AuthApiError. signOut scope "local" deletes cookies FIRST (app uses local only,
  decided 2026-11-16). Cookie writes via ssr SIGNED_OUT subscriber -> setAll, inside the await.
- signInWithOtp for a new email sends Confirm signup template (only magic-link.html in repo).
- Max 1,000 rows per read by default.
- Migrations run by hand in the SQL editor; deploying code that reads a new column first breaks prod.
- foods.price is NOT NULL today; "no price yet" only becomes real with purchases.
- parseDecimal uses Number(): "0x10" = 16, "1e2" = 100 (raised once, out of scope).
