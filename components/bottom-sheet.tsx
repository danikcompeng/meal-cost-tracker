"use client";

// A panel that slides up from the bottom of the screen.
//
// It's built on the browser's own <dialog> element opened with showModal().
// That gives a lot for free: Escape closes it, keyboard focus stays inside
// it, and the page behind can't be clicked or read by screen readers while
// it's open. Tapping the dimmed area outside the panel closes it too.

import { useEffect, useRef } from "react";
import { motion, useIsPresent, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { DURATION, EASE_IN, SPRING } from "@/lib/motion";
import { AutoHeight } from "./collapse";

// Closing: the sheet slides down off the screen (a fade with Reduce
// Motion) while its dimmed backdrop fades, DURATION.base. For that, every
// sheet is drawn inside an <AnimatePresence>, which keeps it on the page
// until the slide is done. Something that should happen once the sheet
// is out of the way (Today's row sliding after a swap) asks how long that
// still takes.
const CLOSE = { duration: DURATION.base, ease: EASE_IN };
let closedAt = 0;
/** Milliseconds until a sheet that's closing right now has gone (0 if none). */
export function untilSheetClosed(): number {
  return Math.max(0, closedAt - performance.now());
}

export function BottomSheet({
  title,
  onClose,
  step,
  stepFade,
  children,
}: {
  title: string;
  onClose: () => void;
  /**
   * Which step the sheet is on ("pick", a food's id...). When it changes,
   * the sheet's top edge glides to the new height instead of jumping,
   * and the new step fades in (AutoHeight in collapse.tsx).
   */
  step?: string;
  /** Off where the new step has its own entrance (the next swap card). */
  stepFade?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  // false once the page has closed this sheet: it's sliding away.
  const isPresent = useIsPresent();
  // Gives the page back (scrolling, focus); set by the effect below.
  const giveBack = useRef<(() => void) | null>(null);
  const closing = useRef(false);

  // The page closed the sheet: really close the dialog straight away,
  // and only keep drawing it for the slide (the "closing" look below).
  // An open dialog makes the rest of the page untouchable, so focus
  // couldn't go back to the button that opened it, nor wherever the page
  // sends it next (Today's "+ Add" after a delete). This runs before the
  // page's own effects, so the page still has the last word on focus.
  useEffect(() => {
    if (isPresent) return;
    closing.current = true;
    closedAt = performance.now() + CLOSE.duration * 1000;
    ref.current?.close();
    giveBack.current?.();
  }, [isPresent]);

  useEffect(() => {
    const dialog = ref.current;
    // Remember what was focused (the button that opened the sheet), so
    // keyboard and screen-reader users land back there when it closes.
    // The browser would normally do this, but React removes the dialog from
    // the page before closing it, which skips that step.
    const opener = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    // Start on the title, not the ×. showModal() moves focus into the sheet
    // by code, and for focus moved by code the browser guesses whether to
    // draw a ring; on iPhone it guesses "yes" even after a tap (a tap never
    // focuses the button you tapped, so Safari can't tell it was a tap).
    // The title draws no ring, a screen reader reads it out ("Add to
    // breakfast"), and the first Tab still reaches the ×. tabIndex -1
    // makes the title the first focusable thing in the sheet, so most
    // browsers start there by themselves; this line covers any that pick
    // the × anyway. (A child's own autoFocus can't help: it runs while the
    // sheet is still shut, and focus can't go into a hidden sheet.)
    //
    // A box marked data-autofocus ("New recipe"'s name, the amount when
    // Today opens straight to a scanned food) gets focus instead, now that
    // the sheet is open, so you can type straight away. On an iPhone the
    // keyboard may or may not open by itself: Safari only opens it when
    // the focus comes from a tap (likely for "New recipe", which you tap
    // to open; not after a scan, which opens the page).
    const marked = dialog?.querySelector<HTMLElement>("[data-autofocus]");
    if (marked) marked.focus();
    else if (document.activeElement === closeRef.current) titleRef.current?.focus();
    // Stop the page behind from scrolling while the sheet is open (iPhones
    // otherwise scroll the page when you drag inside the sheet).
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    // Once, when it starts closing (or is removed without a slide).
    let given = false;
    giveBack.current = () => {
      if (given) return;
      given = true;
      root.style.overflow = before;
      // Only if it's still on the page (logging can re-draw the list).
      if (opener?.isConnected) opener.focus();
    };
    return () => {
      dialog?.close();
      giveBack.current?.();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="sheet-title"
      // "cancel" fires on Escape; let React's state close it instead.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // A backup for any other way the browser closes it (e.g. Android's
      // back gesture), so React's state never thinks it's still open.
      //
      // The "is it still shut?" check matters: the browser announces a close
      // a moment AFTER close() runs. In development, React runs every effect
      // twice on purpose (open, close, open again), so the announcement from
      // that practice close arrives after the sheet has re-opened, and
      // without this check it would shut the sheet straight away. A real
      // close leaves the dialog shut, so it still gets through.
      //
      // Not while it's sliding away: the page already closed it, and by
      // then it may have opened another sheet this would close.
      onClose={(e) => {
        if (!e.currentTarget.open && !closing.current) onClose();
      }}
      // A click whose target is the <dialog> itself landed on the backdrop.
      onClick={(e) => {
        if (e.target === e.currentTarget && !closing.current) onClose();
      }}
      className={
        isPresent
          ? "mx-auto mt-auto mb-0 max-h-[85dvh] w-full max-w-lg overflow-visible bg-transparent p-0 text-foreground backdrop:bg-scrim"
          : // Sliding away: no longer an open dialog, so drawn by hand where
            // it was (the bottom of the screen, above everything), with a
            // dim layer of its own fading out, and letting taps through.
            "pointer-events-none fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-end justify-center overflow-visible bg-transparent p-0 text-foreground"
      }
    >
      {!isPresent && (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          // It appears while the sheet is already leaving, so this fade is
          // also its "exit" (the sheet waits for it).
          exit={{ opacity: 0 }}
          transition={CLOSE}
          className="absolute inset-0 bg-scrim"
        />
      )}
      <motion.div
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={SPRING.sheet}
        // Slides down off the screen; with Reduce Motion, fades.
        exit={reduceMotion ? { opacity: 0, transition: CLOSE } : { y: "100%", transition: CLOSE }}
        // surface-raised (globals.css): in dark mode, tiles and hovers
        // inside go one step lighter than the sheet.
        className="surface-raised relative flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-2xl border border-b-0 border-border bg-popover pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-center justify-between px-4 pt-3">
          {/* tabIndex -1: code can focus it (see above), Tab skips it. */}
          <h2 ref={titleRef} id="sheet-title" tabIndex={-1} className="text-lg font-semibold outline-none">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            // Our matcha ring (focus-ring, globals.css), only for keyboard
            // focus, instead of Safari's built-in blue one.
            className="focus-ring press -mr-2 flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-4">
          <AutoHeight step={step} fade={stepFade}>
            {children}
          </AutoHeight>
        </div>
      </motion.div>
    </dialog>
  );
}
