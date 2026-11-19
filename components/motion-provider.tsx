"use client";

import { MotionConfig } from "framer-motion";

// Reduce Motion, once for the whole app (plans/motion.md). reducedMotion
// "user": if your phone asks for less motion, Framer Motion skips
// movement (slides, scaling, the swap card's grow) and keeps fades.
//
// What it can't skip by itself, so those check the setting themselves:
// height (Collapse), animate() calls in gesture code (the swipe row and
// the swap card) and the CSS press (globals.css).
//
// A client component of its own because the root layout is a server
// component: it can't use MotionConfig directly, but it can hand its
// children to one.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
