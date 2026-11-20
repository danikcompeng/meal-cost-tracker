// One shake (left-right twice, 6 px then 4 px, 250 ms) on a box that's
// wrong or a button whose save failed (plans/motion.md, item 3).
//
// It uses the browser's own element.animate(): no React state, nothing
// redraws, and the browser drops it by itself when it ends. It moves the
// box only: the label above and the red line below stay still, so you can
// read them while it moves.
//
// Reduce Motion: no shake. The red box, the red line and the focus move
// already say it.

import { DURATION, SHAKE_X } from "@/lib/motion";

const KEYFRAMES = SHAKE_X.map((x) => ({ transform: `translateX(${x}px)` }));

/** Shakes each element once. Safe to call again while one is shaking. */
export function shake(elements: Iterable<HTMLElement>) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (const element of elements) {
    element.animate(KEYFRAMES, { duration: DURATION.slow * 1000, easing: "ease-in-out" });
  }
}

/**
 * What moves when a box shakes: the box, or the small wrapper it sits in
 * when that wrapper holds nothing but the box and what's drawn inside it
 * (the "g" of Amount, the "$" of Price, the unit menu beside Package
 * size), so those move with it. Never a wrapper that also holds the label
 * or the error line.
 */
export function shakeTarget(box: HTMLElement): HTMLElement {
  const wrapper = box.parentElement;
  if (!wrapper) return box;
  const onlyTheBox = [...wrapper.children].every(
    (child) => child === box || child.getAttribute("aria-hidden") === "true" || child.tagName === "SELECT",
  );
  return onlyTheBox ? wrapper : box;
}
