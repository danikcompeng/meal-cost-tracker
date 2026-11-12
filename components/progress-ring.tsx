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
// Reduced motion: Framer Motion's reducedMotion setting only skips
// movement (slides, scaling), not a stroke being drawn, so it's turned
// off by hand here: the ring just appears at its value.

import { motion, useReducedMotion } from "framer-motion";

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
        className="stroke-background"
      />
      <motion.circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        className="stroke-matcha-soft"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: value }}
        // A round end on an empty ring would still draw a dot, so hide it.
        style={{ opacity: value === 0 ? 0 : 1 }}
        transition={
          reduceMotion ? { duration: 0 } : { duration: 0.8, ease: "easeOut", delay }
        }
      />
    </svg>
  );
}
