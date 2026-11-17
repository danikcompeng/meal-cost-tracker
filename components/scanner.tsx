"use client";

// The full-screen camera view: live picture, scanning frame, close and
// torch buttons, a hint, and "Type the number" / "Enter manually".
// After a read, `children` (the lookup panel) slides up over the frozen
// picture.

import { useRef } from "react";
import { motion } from "framer-motion";
import { Flashlight, FlashlightOff, X } from "lucide-react";
import type { CameraProblem } from "@/lib/camera";
import { cn } from "@/lib/utils";
import { IconSwap } from "./icon-swap";
import { ScanFrame } from "./scan-frame";
import { useBarcodeCamera } from "./use-barcode-camera";

// Buttons over the camera picture sit on the near-black camera colour at
// 80%: over a white counter, the old see-through black (40%) left the
// light text and icons at about 2.4:1; this keeps them at 8.4:1.
const ROUND_BUTTON =
  "flex size-11 items-center justify-center rounded-full bg-camera/80 text-camera-foreground outline-none focus-visible:ring-3 focus-visible:ring-camera-accent";

export function Scanner({
  onDetected,
  onProblem,
  onClose,
  onTypeNumber,
  onManual,
  children,
}: {
  onDetected: (barcode: string) => void;
  onProblem: (problem: CameraProblem) => void;
  onClose: () => void;
  onTypeNumber: () => void;
  onManual: () => void;
  /** The lookup panel, shown after a read. */
  children?: React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<HTMLCanvasElement>(null);
  const { status, slow, torch } = useBarcodeCamera({
    videoRef,
    frameRef,
    snapshotRef,
    onDetected,
    onProblem,
  });
  const read = status === "read";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 overflow-hidden bg-camera text-camera-foreground"
    >
      {/* The screen's title, for screen readers only: the camera picture
          says it for everyone else. Results below it are h2s. */}
      <h1 className="sr-only">Scan a barcode</h1>
      {/* playsInline + muted: iPhones otherwise open the video full screen
          in their own player, or refuse to start it without a tap. */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        aria-hidden="true"
        className={cn("absolute inset-0 size-full object-cover", read && "invisible")}
      />
      {/* The frozen picture after a read (same size and crop as the video). */}
      <canvas
        ref={snapshotRef}
        aria-hidden="true"
        className={cn(
          "absolute inset-0 size-full object-cover transition-opacity duration-300",
          read ? "opacity-50" : "invisible",
        )}
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-4">
        <ScanFrame ref={frameRef} state={status} />
        {/* A dark pill behind the words: straight on the camera picture,
            over something white, they dropped to about 4.1:1. On the pill
            it's 8.4:1 whatever the camera sees. */}
        {/* min-h-16: room for two lines, so the frame above doesn't move
            when the hint changes length. */}
        <div className="relative flex min-h-16 max-w-xs items-start justify-center">
          <p
            className="rounded-2xl bg-camera/80 px-4 py-2 text-center text-base"
            role="status"
            aria-live="polite"
          >
            {status === "starting"
              ? "Starting camera…"
              : read
                ? "Got it"
                : slow
                  ? "Hold it a little further away if it's blurry"
                  : "Line up the barcode inside the frame"}
          </p>
        </div>
      </div>

      {/* Top bar, kept clear of the notch with the safe-area insets: at the
          top, and at the sides when the phone is held sideways (the notch
          is then on the left or right). */}
      <div className="absolute inset-x-0 top-0 flex justify-between pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]">
        <button type="button" onClick={onClose} aria-label="Close scanner" className={ROUND_BUTTON}>
          <X aria-hidden="true" className="size-6" />
        </button>
        {/* Only phones whose browser allows it (most Android phones;
            iPhones don't let websites use the torch). */}
        {torch.available && !read && (
          <button
            type="button"
            onClick={torch.toggle}
            aria-label={torch.on ? "Turn torch off" : "Turn torch on"}
            aria-pressed={torch.on}
            className={ROUND_BUTTON}
          >
            {/* Blurs and fades between the two icons (instant with
                Reduce Motion): icon-swap.tsx. */}
            <IconSwap swapKey={torch.on ? "on" : "off"}>
              {torch.on ? (
                <FlashlightOff aria-hidden="true" className="size-5" />
              ) : (
                <Flashlight aria-hidden="true" className="size-5" />
              )}
            </IconSwap>
          </button>
        )}
      </div>

      {!read && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onTypeNumber}
            className="h-11 rounded-full bg-camera/80 px-5 text-base font-medium outline-none focus-visible:ring-3 focus-visible:ring-camera-accent"
          >
            Type the number
          </button>
          <button
            type="button"
            onClick={onManual}
            className="h-11 rounded-full bg-camera/80 px-5 text-base font-medium outline-none focus-visible:ring-3 focus-visible:ring-camera-accent"
          >
            Enter manually
          </button>
        </div>
      )}

      {children}
    </motion.div>
  );
}
