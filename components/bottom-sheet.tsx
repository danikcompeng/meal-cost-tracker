"use client";

// A panel that slides up from the bottom of the screen.
//
// It's built on the browser's own <dialog> element opened with showModal().
// That gives a lot for free: Escape closes it, keyboard focus stays inside
// it, and the page behind can't be clicked or read by screen readers while
// it's open. Tapping the dimmed area outside the panel closes it too.

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

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
    if (document.activeElement === closeRef.current) titleRef.current?.focus();
    // Stop the page behind from scrolling while the sheet is open (iPhones
    // otherwise scroll the page when you drag inside the sheet).
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = before;
      dialog?.close();
      // Only if it's still on the page (logging can re-draw the list).
      if (opener?.isConnected) opener.focus();
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
      onClose={(e) => {
        if (!e.currentTarget.open) onClose();
      }}
      // A click whose target is the <dialog> itself landed on the backdrop.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="mx-auto mt-auto mb-0 max-h-[85dvh] w-full max-w-lg overflow-visible bg-transparent p-0 text-foreground backdrop:bg-black/40"
    >
      <motion.div
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
        className="flex max-h-[85dvh] flex-col rounded-t-2xl border border-b-0 border-border bg-popover pb-[env(safe-area-inset-bottom)]"
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
            className="focus-ring -mr-2 flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-4">{children}</div>
      </motion.div>
    </dialog>
  );
}
