"use client";

// "Lunch is now Lentil dal · 1.5 servings   Undo", just above the tab bar.
// Also, without Undo, "Couldn't swap" when a swap fails after you've
// already closed its sheet (there's nowhere else to say it).
//
// It goes by itself after 10 seconds, but not while your finger, mouse or
// keyboard focus is on it: you might be about to tap Undo. Moving away
// starts the 10 seconds again.
//
// The outer box is always on the page, even with no message in it. Screen
// readers only watch a "status" box for changes if it was already there,
// so a box that appears together with its text may never be read out.

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const SHOW_FOR_MS = 10_000;

/** Why Undo didn't work. `final`: trying again can't help. */
export type UndoProblem = { message: string; final: boolean };

export type Toast = {
  /** A new id for every message, so a second swap restarts the timer. */
  id: number;
  text: string;
  /** Shown in the warning colour ("Couldn't swap"). */
  isError?: boolean;
  /** Puts things back: null if it worked. No undo = no Undo button. */
  undo?: () => Promise<UndoProblem | null>;
  /**
   * Where keyboard focus goes when the Undo button disappears (it worked,
   * or it never can): otherwise focus would fall out to the page.
   */
  focusAfterUndo?: () => void;
};

export function UndoToast({ toast, onDismiss }: { toast: Toast | null; onDismiss: () => void }) {
  return (
    <div
      role="status"
      // Fixed above the tab bar (about 4 rem tall, plus the iPhone's home
      // bar). Taps pass through the empty box; only the message takes them.
      className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-lg px-4"
    >
      {/* mode="wait": a second message waits for the first to fade out,
          instead of both showing for a moment. */}
      <AnimatePresence mode="wait">
        {toast && <Message key={toast.id} toast={toast} onDismiss={onDismiss} />}
      </AnimatePresence>
    </div>
  );
}

function Message({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [problem, setProblem] = useState<UndoProblem | null>(null);

  // The ref holds the latest onDismiss, so a redraw of the page doesn't
  // restart the 10 seconds.
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });
  const waiting = hovered || focused || undoing;
  useEffect(() => {
    if (waiting) return;
    const timer = setTimeout(() => dismissRef.current(), SHOW_FOR_MS);
    return () => clearTimeout(timer);
  }, [waiting]);

  async function handleUndo() {
    if (undoing || !toast.undo) return;
    setUndoing(true);
    setProblem(null);
    const why = await toast.undo();
    setUndoing(false);
    // Didn't work: say why and stay (with Undo, if trying again can help).
    if (why) setProblem(why);
    // Worked (the page closes this message) or never can: the button goes,
    // so put focus back on the row. Always, not only after a keyboard:
    // iPhones don't move focus to a tapped button, VoiceOver included, so
    // there's no telling. A tap doesn't draw a focus ring, so it's harmless.
    if (!why || why.final) toast.focusAfterUndo?.();
  }

  const showUndo = toast.undo !== undefined && !problem?.final;
  const isError = toast.isError || problem !== null;

  return (
    // With reduced motion, MotionConfig (on Today) drops the slide and
    // keeps the fade.
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 16, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        // Still inside (focus moved between parts of the message)?
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      className={`pointer-events-auto flex min-h-[3.25rem] items-center gap-3 rounded-2xl border border-border bg-popover py-1 pl-4 ${
        showUndo ? "pr-1" : "pr-4"
      }`}
    >
      <p className={`min-w-0 flex-1 text-sm ${isError ? "text-destructive" : ""}`}>
        {problem?.message ?? toast.text}
      </p>
      {showUndo && (
        <Button
          variant="ghost"
          onClick={() => void handleUndo()}
          // Not "disabled": that can push keyboard focus off the button.
          // focusableWhenDisabled keeps it focusable and ignores taps.
          disabled={undoing}
          focusableWhenDisabled
          className="h-11 shrink-0 px-4 text-base font-semibold text-primary"
        >
          {undoing ? "Undoing…" : "Undo"}
        </Button>
      )}
    </motion.div>
  );
}
