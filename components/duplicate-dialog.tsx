"use client";

// "You already have Rolled oats. Update it with these numbers, or keep
// both?" Shown when a new food has the same name and brand as one of yours.
//
// It's the browser's own <dialog>, opened with showModal(). That gives a
// lot for free: the dimmed backdrop, focus kept inside the dialog, Esc to
// close, the rest of the page unreachable, screen readers announcing it as
// a dialog. (Focus going back to Save is done by hand, see below.)
//
// The two answers are submit buttons of the food form (the dialog sits
// inside the <form>), named "duplicateChoice". Pressing one sends the
// form again with its value ("update" or "keep") added, so the server
// knows what you chose and the form keeps everything you typed.

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/types";

const SHOWN_CHANGES = 3;

export function DuplicateDialog({
  duplicate,
  pending,
  onCancel,
  returnFocusTo,
}: {
  duplicate: NonNullable<FormState["duplicate"]>;
  pending: boolean;
  onCancel: () => void;
  /** Where keyboard focus goes when the dialog closes: the Save button. */
  returnFocusTo: React.RefObject<HTMLButtonElement | null>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    // Start on Cancel, so pressing Enter by accident can't overwrite your
    // food. (React's autoFocus runs before the dialog is open, so it
    // wouldn't work here.)
    cancelRef.current?.focus();
    // React removes the dialog from the page before this runs, which skips
    // the browser's own "focus goes back" step, so do it by hand.
    const returnTo = returnFocusTo.current;
    return () => {
      dialog.close();
      returnTo?.focus();
    };
  }, [returnFocusTo]);

  // While "Update" or "Keep both" is saving, Esc and the backdrop do
  // nothing, like the disabled Cancel button: closing it then would look
  // like cancelling while the save still goes through.
  const cancel = () => {
    if (!pending) onCancel();
  };

  const { name, brand, changes } = duplicate;
  const more = changes.length - SHOWN_CHANGES;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="duplicate-title"
      aria-describedby="duplicate-question"
      // Esc: the browser would close the dialog by itself; let React do it
      // instead, so its state and the screen agree.
      onCancel={(e) => {
        e.preventDefault();
        cancel();
      }}
      // A tap on the dimmed backdrop lands on the <dialog> itself (the card
      // inside covers the rest), so it counts as Cancel.
      onClick={(e) => {
        if (e.target === e.currentTarget) cancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-border bg-popover p-0 text-popover-foreground transition-[opacity,scale] duration-150 backdrop:bg-black/50 starting:opacity-0 motion-safe:starting:scale-97"
    >
      <div className="space-y-4 p-5">
        <h2 id="duplicate-title" className="text-lg font-semibold">
          You already have {name}
          {brand && <span className="font-normal text-muted-foreground"> · {brand}</span>}
        </h2>
        <p id="duplicate-question">Update it with these numbers, or keep both?</p>

        <ul className="space-y-1 text-[13px] tabular-nums">
          {changes.length === 0 ? (
            <li className="text-muted-foreground">Same numbers as the one you have.</li>
          ) : (
            <>
              {changes.slice(0, SHOWN_CHANGES).map((line) => (
                <li key={line}>{line}</li>
              ))}
              {more > 0 && <li className="text-muted-foreground">and {more} more</li>}
            </>
          )}
        </ul>

        <p className="text-[13px] text-muted-foreground">
          Past days keep the numbers they were logged with.
        </p>

        <div className="space-y-2 pt-1">
          <Button
            type="submit"
            name="duplicateChoice"
            value="update"
            disabled={pending}
            className="h-11 w-full text-base"
          >
            Update existing
          </Button>
          <Button
            type="submit"
            name="duplicateChoice"
            value="keep"
            variant="outline"
            disabled={pending}
            className="h-11 w-full text-base"
          >
            Keep both
          </Button>
          <Button
            ref={cancelRef}
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={pending}
            className="h-11 w-full text-base"
          >
            Cancel
          </Button>
        </div>
      </div>
    </dialog>
  );
}
