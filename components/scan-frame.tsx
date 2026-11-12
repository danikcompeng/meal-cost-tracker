"use client";

// The scanning frame: a wide rounded window in the middle of the camera
// picture, with everything outside it dimmed and four corner brackets.
//
// The dimming is one huge shadow around the frame (box-shadow spreads
// outward), so the frame itself stays a clear "hole" with no extra layers.
//
// Motion: while scanning, the corners slowly brighten and fade (every 2 s)
// so you can tell it's alive. On a read they snap in a little and turn
// matcha. With reduced motion, neither: only the colour changes.

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type FrameState = "starting" | "scanning" | "read";

const CORNERS = [
  "top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl",
  "top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl",
  "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl",
  "bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl",
];

// In React 19 a component can take `ref` like any other prop. The scanner
// needs it to know where the frame is on screen.
export function ScanFrame({ state, ref }: { state: FrameState; ref: React.Ref<HTMLDivElement> }) {
  const reduceMotion = useReducedMotion();
  const breathing = state === "scanning" && !reduceMotion;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      // Barcodes are wide, so the frame is too. Capped so it doesn't get
      // huge on a tablet or laptop.
      className="relative aspect-[16/10] w-[min(80vw,360px)] rounded-2xl shadow-[0_0_0_9999px_rgb(20_20_20/0.6)]"
    >
      <motion.div
        className="absolute inset-0"
        animate={
          state === "read" && !reduceMotion
            ? { scale: 0.96, opacity: 1 }
            : breathing
              ? { scale: 1, opacity: [0.6, 1, 0.6] }
              : { scale: 1, opacity: 1 }
        }
        transition={
          breathing
            ? { opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" } }
            : { type: "spring", stiffness: 420, damping: 30 }
        }
      >
        {CORNERS.map((corner) => (
          <span
            key={corner}
            className={cn(
              "absolute size-8 transition-colors duration-150",
              corner,
              state === "read" ? "border-camera-accent" : "border-camera-foreground",
            )}
          />
        ))}
      </motion.div>
    </div>
  );
}
