"use client";

// What you see after a barcode is read, while it's looked up and when the
// lookup doesn't find a food: looking up, not found, offline, not
// answering. Shown in a panel that slides up over the frozen camera
// picture (ScanPanel), or under the input when you typed the number.

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export type LookupState = "looking" | "not_found" | "offline" | "unavailable" | "error";
export type Lookup = { barcode: string; state: LookupState };

export function LookupStatus({
  lookup,
  onAddIt,
  onScanAgain,
  onRetry,
  onManual,
  scanAgainLabel = "Scan again",
}: {
  lookup: Lookup;
  onAddIt: (barcode: string) => void;
  onScanAgain: () => void;
  onRetry: (barcode: string) => void;
  onManual: (barcode: string) => void;
  scanAgainLabel?: string;
}) {
  const { state, barcode } = lookup;
  const number = <p className="text-[13px] text-muted-foreground tabular-nums">{barcode}</p>;

  if (state === "looking") {
    return (
      <div role="status" aria-live="polite" className="space-y-3">
        <p className="text-lg font-medium">Looking up…</p>
        {number}
        {/* Grey placeholder lines where the name and brand will go. */}
        <div aria-hidden="true" className="space-y-2 pt-1">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        </div>
      </div>
    );
  }

  if (state === "not_found") {
    return (
      <div role="status" className="space-y-4">
        <div className="space-y-1">
          <p className="text-lg font-medium">Not on Open Food Facts yet</p>
          {number}
        </div>
        <p className="text-muted-foreground">
          Add it yourself and it&apos;ll be recognised next time you scan.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => onAddIt(barcode)} className="h-11 flex-1 text-base">
            Add it
          </Button>
          <Button variant="outline" onClick={onScanAgain} className="h-11 flex-1 text-base">
            {scanAgainLabel}
          </Button>
        </div>
      </div>
    );
  }

  const copy = {
    offline: {
      title: "You're offline",
      body: "We need a connection to look this up. The barcode is kept, so you don't have to scan it again.",
    },
    unavailable: {
      title: "Open Food Facts isn't answering",
      body: "Their site may be busy. Try again in a moment, or enter the food yourself.",
    },
    error: {
      title: "Couldn't look this up",
      body: "Something went wrong on our side. Try again, or enter the food yourself.",
    },
  }[state];

  return (
    <div role="alert" className="space-y-4">
      <div className="space-y-1">
        <p className="text-lg font-medium">{copy.title}</p>
        {number}
      </div>
      <p className="text-muted-foreground">{copy.body}</p>
      <div className="flex gap-2">
        <Button onClick={() => onRetry(barcode)} className="h-11 flex-1 text-base">
          Try again
        </Button>
        <Button variant="outline" onClick={() => onManual(barcode)} className="h-11 flex-1 text-base">
          Enter manually
        </Button>
      </div>
    </div>
  );
}

/** The white panel that slides up from the bottom of the camera screen. */
export function ScanPanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      // With reduced motion, MotionConfig skips the slide and keeps the fade.
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
      className="absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-2xl bg-popover px-4 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-popover-foreground"
    >
      {children}
    </motion.div>
  );
}
