---
name: framer-motion
description: Verified Framer Motion / motion-dom behaviour (reduced motion, drag, animate().then, press utilities) that past Meal Cost Tracker reviews relied on
metadata:
  type: reference
---

Verified by reading node_modules/motion-dom. Re-check if framer-motion is upgraded.

Reduced motion
- MotionConfig reducedMotion JUMPS motion-dom positionalKeys = width/height/top/left/right/bottom +
  ALL transforms (x, y, scale, rotate) ({type:false}, visual-element-target.mjs:86,
  render/utils/keys-position.mjs); never opacity or filter (blur). Exit {scale/height + opacity}
  therefore snaps first, then fades; height 0 exit hides the fade entirely.
- Since motion commit 33de7f5: ONE MotionConfig reducedMotion="user" in app/layout.tsx
  (components/motion-provider.tsx) covers every screen. Standalone animate(x, ...) calls and drag's
  own release animation (animateMotionValue) ignore it. Projection `layout` animations jump too.
- CSS press (globals.css @utility press / press-wide) has its own prefers-reduced-motion media.

Motion values / animate()
- MotionValue.stop()/jump() stop an animate(x) run and its .then NEVER fires; x.set() does NOT stop
  it. So "commit in .then + a latch" can get stuck; check for it.

Drag (VisualElementDragControls)
- Pointerdown (PanSession onSessionStart -> stopAnimation) stops BOTH x and y motion values even with
  drag="x" (eachAxis). A y entrance (swap card y 8 -> 0) freezes if pressed mid-way.
- onDragEnd also fires on pointercancel (browser took the scroll) and when dragDirectionLock locked
  "y"; PanInfo offset/velocity are the POINTER's. Any "flick = commit" rule needs a lock-"x" check.
  onDragStart fires at 3 px (tap wobble). onDragEnd runs in postRender AFTER the snap-back started.
- Press then pointercancel before 3 px: NEITHER onDragEnd NOR React onPointerUp fires -> x stuck.
  "Settle on release" designs need onPointerCancel too.
- Release: y-locked gesture -> startAnimation skips x (no spring back); no-drag tap/cancel ->
  resumeAnimation only if constraints resolved (first onStart) and currentDirection allows x.
  Lock = 10 px, checks y first. Gesture code never preventDefaults pointerdown (CSS :active works).

Press utilities (motion pass item 2)
- press/press-wide skip :disabled, [aria-disabled="true"], [data-unavailable], [data-dragging] on the
  element ITSELF only; children of a data-dragging row (swap icon) still shrink.
- Springs as visualDuration+bounce: stiffness = (2pi / (1.2 x vd))^2, damping ratio = 1 - bounce.
  0.25 s -> k 439; 0.2 s -> k 685.
