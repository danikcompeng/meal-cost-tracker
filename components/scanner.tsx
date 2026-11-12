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
import { ScanFrame } from "./scan-frame";
import { useBarcodeCamera } from "./use-barcode-camera";

const ROUND_BUTTON =
  "flex size-11 items-center justify-center rounded-full bg-black/40 text-camera-foreground outline-none focus-visible:ring-3 focus-visible:ring-camera-accent";

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
        <p className="relative min-h-12 max-w-xs text-center text-base" role="status" aria-live="polite">
          {status === "starting"
            ? "Starting camera…"
            : read
              ? "Got it"
              : slow
                ? "Hold it a little further away if it's blurry"
                : "Line up the barcode inside the frame"}
        </p>
      </div>

      {/* Top bar, kept clear of the notch with the safe-area inset. */}
      <div className="absolute inset-x-0 top-0 flex justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
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
            {torch.on ? (
              <FlashlightOff aria-hidden="true" className="size-5" />
            ) : (
              <Flashlight aria-hidden="true" className="size-5" />
            )}
          </button>
        )}
      </div>

      {!read && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onTypeNumber}
            className="h-11 rounded-full bg-black/40 px-5 text-base font-medium outline-none focus-visible:ring-3 focus-visible:ring-camera-accent"
          >
            Type the number
          </button>
          <button
            type="button"
            onClick={onManual}
            className="h-11 rounded-full bg-black/40 px-5 text-base font-medium outline-none focus-visible:ring-3 focus-visible:ring-camera-accent"
          >
            Enter manually
          </button>
        </div>
      )}

      {children}
    </motion.div>
  );
}
