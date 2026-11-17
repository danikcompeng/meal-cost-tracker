"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// Swaps one icon for another (the torch's on / off) with a quick blur and
// fade: the old icon blurs, shrinks a little and fades out while the new
// one comes in the same way, in the same spot. A change you can see
// happen, instead of one icon blinking into another.
//
// `swapKey` names which icon is showing; a new key starts the swap.
// Both icons sit in the same grid cell, so they overlap while they cross.
//
// With Reduce Motion on, it swaps instantly. Framer Motion's own
// reduced-motion setting only skips movement (slides, scaling), not
// blur or fading, so this checks for itself.
export function IconSwap({ swapKey, children }: { swapKey: string; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <>{children}</>;

  return (
    <span className="inline-grid place-items-center">
      {/* initial={false}: the first icon is just there, no blur on load. */}
      <AnimatePresence initial={false}>
        <motion.span
          key={swapKey}
          className="col-start-1 row-start-1 inline-flex"
          initial={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
