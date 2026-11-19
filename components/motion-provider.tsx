"use client";

import { MotionConfig } from "framer-motion";

// Reduce Motion, once for the whole app (plans/motion.md). reducedMotion
// "user": if your phone asks for less motion, Framer Motion jumps
// anything that moves, scales or resizes (slides, the swap card's grow,
// height) straight to where it ends, and keeps fades.
//
// Some places still check the setting themselves:
// - a height that jumps to 0 takes its fade with it (the row is gone
//   before it can fade), so those ask for a fade only;
// - animate() calls in gesture code (the swipe row, the swap card) and
//   the CSS press (globals.css) don't go through this at all.
//
// A client component of its own because the root layout is a server
// component: it can't use MotionConfig directly, but it can hand its
// children to one.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
