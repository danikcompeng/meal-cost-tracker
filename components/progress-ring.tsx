"use client";

// A circular progress ring, drawn as two SVG circles: a grey track and a
// matcha arc on top that fills clockwise from 12 o'clock.
//
// Hidden from screen readers (aria-hidden): the amount is always written
// next to it, and that text is what gets read out.
//
// How the fill works: Framer Motion's `pathLength` draws only part of the
// circle's outline (0 = none, 1 = all of it). When the fraction changes
// (you logged something), it animates from where it was to the new value.
//
// Filling up from empty happens once per visit: the first time Today
// shows its rings after the app is opened (or reloaded). Rings that appear
// later in the same visit (back from Kitchen, Back to today) start at
// their value. The server always draws them empty, so the first ones
// fill from there.
//
// Reduced motion: Framer Motion's reducedMotion setting only skips
// movement (slides, scaling), not a stroke being drawn, so it's turned
// off by hand here: the ring just appears at its value.

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FILL_DURATION, FILL_EASE } from "@/lib/motion";

// Outside the component, so it lasts as long as the page: a new visit
// loads the code again and starts at false. Set only in the browser (in
// an effect), never on the server, where one copy serves everyone.
let filledThisVisit = false;

export function ProgressRing({
  fraction,
  size,
  stroke,
  delay = 0,
  className,
}: {
  /** How full, 0 to 1. Values outside that are clamped. */
  fraction: number;
  /** Width and height in px. */
  size: number;
  /** Thickness of the ring in px. */
  stroke: number;
  /** Seconds to wait before filling, so small rings follow the big one. */
  delay?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  // Decided once, when the ring appears. All the rings of the first
  // summary appear together, so they all read false and all fill.
  const [fillFromEmpty] = useState(() => !filledThisVisit);
  useEffect(() => {
    filledThisVisit = true;
  }, []);
  const value = Math.min(Math.max(fraction, 0), 1);
  const radius = (size - stroke) / 2;
  const center = size / 2;

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      // Turned a quarter left, so the arc starts at 12 o'clock.
      className={`-rotate-90 ${className ?? ""}`}
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        // The track: one step in from the tile it sits on.
        className="stroke-inset"
      />
      <motion.circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        className="stroke-matcha-soft"
        // false: starts at its value, no fill (a later ring this visit).
        initial={fillFromEmpty ? { pathLength: 0 } : false}
        animate={{ pathLength: value }}
        // A round end on an empty ring would still draw a dot, so hide it.
        style={{ opacity: value === 0 ? 0 : 1 }}
        transition={
          // Fast first, then a long slow landing on the number (FILL_EASE).
          reduceMotion ? { duration: 0 } : { duration: FILL_DURATION, ease: FILL_EASE, delay }
        }
      />
    </svg>
  );
}
