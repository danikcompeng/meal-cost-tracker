"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { useAnimate, useReducedMotion } from "framer-motion";
import { DURATION, EASE_OUT, PULSE_SCALE } from "@/lib/motion";

// "Done": a ring, or a Save button, grows a little and settles back once
// when what it shows changes (you logged, saved or swapped). It's how you
// see which ring your meal just moved.
//
// `when` is what it shows ("62 g"): the pulse plays each time it changes,
// never when it first appears, so the rings filling on a visit or a new
// day sliding in don't pulse. null means "resting": changing to null never
// pulses, so a Save button can pulse on "Saved" and not when you type again.
//
// Only a transform, so it stays smooth on a phone; it never blocks a tap.
// With Reduce Motion: no pulse.

/**
 * Asked at the moment something changes: "stay still this time?" Today
 * says yes while a save that failed goes back, so the rings don't say
 * "done" for something that didn't happen.
 */
export const PulseHush = createContext<() => boolean>(() => false);

export function Pulse({
  when,
  scale = PULSE_SCALE,
  className,
  style,
  children,
}: {
  when: string | number | null;
  /** PULSE_SCALE, or PULSE_SCALE_WIDE for a full-width button. */
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reduceMotion = useReducedMotion();
  const hushed = useContext(PulseHush);
  const last = useRef(when);

  useEffect(() => {
    if (last.current === when) return;
    last.current = when;
    if (when === null || reduceMotion || hushed() || !scope.current) return;
    animate(scope.current, { scale: [1, scale, 1] }, { duration: DURATION.slow, ease: EASE_OUT });
  }, [when, scale, reduceMotion, hushed, animate, scope]);

  return (
    <div ref={scope} className={className} style={style}>
      {children}
    </div>
  );
}
