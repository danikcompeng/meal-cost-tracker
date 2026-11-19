"use client";

// "Lunch is now Lentil dal · 1.5 servings   Undo  ×", just above the tab
// bar. Also, without Undo, "Couldn't swap" when a swap fails after you've
// already closed its sheet (there's nowhere else to say it).
//
// It never goes by itself: it stays until you tap ×, Undo works, a newer
// message replaces it, or you leave Today. A timer can't be made fair to
// VoiceOver users on iPhone: a web page can't tell VoiceOver is on, and
// after the message is read out you still have to swipe your way to Undo,
// which can take longer than any timer we'd pick.
//
// The outer box is always on the page, even with no message in it. Screen
// readers only watch a "status" box for changes if it was already there,
// so a box that appears together with its text may never be read out.

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DURATION, EASE_OUT } from "@/lib/motion";

/** Why Undo didn't work. `final`: trying again can't help. */
export type UndoProblem = { message: string; final: boolean };

export type Toast = {
  /** A new id for every message, so a second swap shows as a new one. */
  id: number;
  text: string;
  /** Shown in the warning colour ("Couldn't swap"). */
  isError?: boolean;
  /** Puts things back: null if it worked. No undo = no Undo button. */
  undo?: () => Promise<UndoProblem | null>;
  /**
   * Where focus goes when the message goes (Undo worked, or you tapped ×),
   * so it doesn't fall out to the top of the page. Only used if focus was
   * in the message: never after a plain tap (see Message).
   */
  focusAfter?: () => void;
};

export function UndoToast({ toast, onDismiss }: { toast: Toast | null; onDismiss: () => void }) {
  return (
    <div
      role="status"
      // Fixed above the tab bar, plus the iPhone's home bar. The bar is
      // about 4.3 rem tall, but the round Scan button (with its ring) sticks
      // up about 1.4 rem above it, so 6 rem clears the button's top.
      // Taps pass through the empty box; only the message takes them.
      // Today adds an h-20 spacer while a message shows, so the page can
      // scroll clear of it: change both together.
      className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-lg px-4"
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
  const [undoing, setUndoing] = useState(false);
  const [problem, setProblem] = useState<UndoProblem | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const dismissButton = useRef<HTMLButtonElement>(null);

  // When a button you used goes away (× or a finished Undo), focus would
  // fall out to the page, so it goes back to the row. But only if focus
  // was in this message: a keyboard puts it there, and VoiceOver on iPhone
  // usually does too. A plain tap on iPhone never focuses the button, and
  // focusing the row by code after a tap would make Safari draw its ring
  // there (the same reason sheets start on their title).
  const focusIsHere = () => ref.current?.contains(document.activeElement) ?? false;

  function handleDismiss() {
    const hadFocus = focusIsHere();
    onDismiss();
    if (hadFocus) toast.focusAfter?.();
  }

  async function handleUndo() {
    if (undoing || !toast.undo) return;
    setUndoing(true);
    setProblem(null);
    const why = await toast.undo();
    // Checked after the wait, not before: if you moved on meanwhile, focus
    // stays where you went. (The button keeps focus while "Undoing…".)
    // And before the state changes below, which may remove the button.
    const stillHere = focusIsHere();
    setUndoing(false);
    // Didn't work: say why and stay (with Undo, if trying again can help).
    if (why) setProblem(why);
    if (!stillHere) return;
    // Worked: the page closes this message, so back to the row.
    if (!why) toast.focusAfter?.();
    // Never can: the Undo button goes but the message stays, showing why,
    // so focus goes to its × right next to it.
    else if (why.final) dismissButton.current?.focus();
  }

  const showUndo = toast.undo !== undefined && !problem?.final;
  const isError = toast.isError || problem !== null;

  return (
    // With Reduce Motion, MotionProvider drops the slide and keeps the fade.
    <motion.div
      ref={ref}
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 16, opacity: 0 }}
      transition={{ duration: DURATION.base, ease: EASE_OUT }}
      className="surface-raised pointer-events-auto flex min-h-13 items-center gap-1 rounded-2xl border border-border bg-popover py-1 pr-1 pl-4"
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
      {/* Not while undoing: closing then would hide whether it worked. */}
      <Button
        ref={dismissButton}
        variant="ghost"
        size="icon"
        onClick={handleDismiss}
        disabled={undoing}
        focusableWhenDisabled
        // Greyed (not faded, so its focus ring stays solid).
        data-unavailable={undoing || undefined}
        aria-label="Dismiss"
        // Concentric with the message's corner (CLAUDE.md, Layout): 18 px
        // corner − 1 px border − 4 px gap = 13 px, so its hover and press
        // fill runs parallel to the edge.
        // text-base: the icon's line follows this size (globals.css), and
        // icon-semibold matches the semibold "Undo" beside it (1.8 px).
        className="size-11 shrink-0 rounded-[calc(var(--radius-2xl)-5px)] text-base text-muted-foreground"
      >
        <X aria-hidden="true" className="icon-semibold size-5" />
      </Button>
    </motion.div>
  );
}
