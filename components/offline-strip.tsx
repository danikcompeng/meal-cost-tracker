"use client";

// A thin grey strip at the top while the phone is offline, so a failed
// save isn't the first you hear of it. It stays at the top while you
// scroll, and slides away when you're back online.

import { AnimatePresence } from "framer-motion";
import { CollapseIn } from "./collapse";
import { useOnline } from "./use-online";

export function OfflineStrip() {
  const online = useOnline();

  return (
    // The status is always on the page (empty and 0 px tall while online),
    // so screen readers notice when the words appear inside it and read
    // them out once. sticky: it stays in view however far you've scrolled.
    <div role="status" className="sticky top-0 z-20 bg-background">
      {/* Opens its space as it fades in, and closes as it goes; with
          Reduce Motion, a plain fade (collapse.tsx). */}
      <AnimatePresence initial={false}>
        {!online && (
          <CollapseIn>
            <div className="mx-auto w-full max-w-lg px-4 py-2">
              <p className="rounded-lg bg-card px-3 py-2 text-center text-label text-muted-foreground">
                You’re offline. Nothing can be saved or loaded until you’re back online.
              </p>
            </div>
          </CollapseIn>
        )}
      </AnimatePresence>
    </div>
  );
}
