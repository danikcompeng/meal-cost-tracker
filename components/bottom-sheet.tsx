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

  useEffect(() => {
    const dialog = ref.current;
    // Remember what was focused (the button that opened the sheet), so
    // keyboard and screen-reader users land back there when it closes.
    // The browser would normally do this, but React removes the dialog from
    // the page before closing it, which skips that step.
    const opener = document.activeElement as HTMLElement | null;
    dialog?.showModal();
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
      onClose={onClose}
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
          <h2 id="sheet-title" className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-4">{children}</div>
      </motion.div>
    </dialog>
  );
}
