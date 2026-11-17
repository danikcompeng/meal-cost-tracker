"use client";

// A thin grey strip at the top while the phone is offline, so a failed
// save isn't the first you hear of it. It stays at the top while you
// scroll, and slides away when you're back online.

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useOnline } from "./use-online";

export function OfflineStrip() {
  const online = useOnline();
  const reduceMotion = useReducedMotion();

  return (
    // The status is always on the page (empty and 0 px tall while online),
    // so screen readers notice when the words appear inside it and read
    // them out once. sticky: it stays in view however far you've scrolled.
    <div role="status" className="sticky top-0 z-20 bg-background">
      <AnimatePresence initial={false}>
        {!online && (
          <motion.div
            // Nothing above this sets MotionConfig, so Framer won't follow
            // the phone's reduce-motion setting by itself: with reduced
            // motion it's a plain fade, no growing.
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mx-auto w-full max-w-lg px-4 py-2">
              <p className="rounded-lg bg-card px-3 py-2 text-center text-label text-muted-foreground">
                You’re offline. Nothing can be saved or loaded until you’re back online.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
