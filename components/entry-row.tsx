"use client";

import { useEffect, useRef } from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useIsPresent,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { Shuffle, Trash2 } from "lucide-react";
import { macroText } from "@/lib/macros";
import type { MealEntry } from "@/lib/types";
import { amountText } from "@/lib/units";

/** Drag left past this share of the row's width, then let go, to delete. */
const DELETE_SHARE = 0.4;
/** Or a flick left this fast (px per second), like the swap stack. */
const DELETE_SPEED = 600;

// One thing you ate. Tap it to change the amount, move it or delete it.
//   Rolled oats                       568.5 kcal
//   150 g · 19.5 g protein
// A recipe gets a swap icon at the right edge ("Tired of this?").
//   Overnight oats                    750 kcal  ⇄
//   1.5 servings · 36 g protein
//
// That's two buttons side by side, not one inside the other: a button
// can't hold another button (screen readers and taps get confused).
//
// Swipe left to delete: the row follows your finger and a red "Delete"
// shows behind it. Let go far enough (or flick) and it's deleted, with
// Undo in the message above the tab bar; otherwise it goes back. Swiping
// is a shortcut: Delete in the edit sheet does the same for keyboards and
// screen readers, so the red strip is hidden from them.
export function EntryRow({
  entry,
  onOpen,
  onSwap,
  onDelete,
}: {
  entry: MealEntry;
  onOpen: () => void;
  /** Only for recipe entries: opens the swap stack. */
  onSwap?: () => void;
  /** Swiped away. The page hides the row at once and deletes it. */
  onDelete: () => void;
}) {
  const reduceMotion = useReducedMotion();
  // The row's sideways position, following your finger. The red strip
  // fades in from it on every frame without React redrawing.
  const x = useMotionValue(0);
  const stripOpacity = useTransform(x, [-64, -8], [1, 0]);
  const rowRef = useRef<HTMLDivElement>(null);
  // Can't be deleted twice (a swipe, then another before it's gone).
  const leaving = useRef(false);
  // Did this touch become a sideways swipe? Framer decides after about
  // 10 px (dragDirectionLock). Until then it may still be a tap or a
  // scroll, and only a sideways one may delete the row or cancel the tap.
  // (Framer reports the finger's speed even for a scroll, so a quick
  // scroll that drifts a little left would otherwise look like a flick.)
  const sideways = useRef(false);

  // false while the row fades out after a delete. If it comes back before
  // it's gone (the delete failed, or a quick Undo), it's the same row, so
  // put it back in place.
  const isPresent = useIsPresent();
  useEffect(() => {
    if (!isPresent) return;
    x.jump(0);
    leaving.current = false;
  }, [isPresent, x]);

  function handleDragEnd(event: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) {
    const width = rowRef.current?.offsetWidth ?? 320;
    // A fast flick only counts while the row is left of where it started:
    // pulling back quickly to the right means "never mind". Never when the
    // browser took the touch over to scroll ("pointercancel").
    const deleting =
      sideways.current &&
      event.type !== "pointercancel" &&
      (offset.x < -width * DELETE_SHARE || (offset.x < 0 && velocity.x < -DELETE_SPEED));
    if (!deleting) {
      // dragConstraints springs it back; with reduced motion it jumps.
      if (reduceMotion) x.jump(0);
      return;
    }
    if (leaving.current) return;
    leaving.current = true;
    if (reduceMotion) {
      // Stays where you let go and just fades out (MealSection).
      x.stop();
    } else {
      // Slides off to the left while the row fades and closes up.
      animate(x, -(width + 32), { duration: 0.2, ease: "easeIn" });
    }
    onDelete();
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      <motion.div
        aria-hidden="true"
        style={{ opacity: stripOpacity }}
        className="absolute inset-0 flex items-center justify-end gap-1.5 bg-destructive/15 pr-4 font-medium text-destructive"
      >
        <Trash2 className="size-4" />
        Delete
      </motion.div>
      <motion.div
        ref={rowRef}
        // Not while it's leaving: a touch would stop it halfway.
        drag={isPresent ? "x" : false}
        // Framer sets touch-action: pan-y for a sideways drag, so the day
        // still scrolls with your finger on a row; this decides which way
        // you meant after a few pixels.
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        // Follows your finger to the left, doesn't move to the right.
        dragElastic={{ left: 1, right: 0 }}
        onPointerDownCapture={() => {
          sideways.current = false;
        }}
        onDirectionLock={(axis) => {
          sideways.current = axis === "x";
        }}
        onDragEnd={handleDragEnd}
        // A swipe isn't also a tap: the browser may still send a click to
        // the button you started on when you let go. A click from the
        // keyboard (Enter, detail 0) always goes through.
        onClickCapture={(e) => {
          if (!sideways.current || e.detail === 0) return;
          e.preventDefault();
          e.stopPropagation();
        }}
        style={{ x }}
        // Solid, so the red strip only shows where the row has moved away.
        className="relative flex items-center rounded-lg bg-background transition-colors hover:bg-accent"
      >
        <button
          type="button"
          onClick={onOpen}
          // So focus can come back here after Undo (see TodayView).
          data-entry-open={entry.id}
          className="flex min-h-14 min-w-0 flex-1 items-start gap-3 rounded-lg px-3 py-2.5 text-left"
        >
          {/* After a swap the entry stays the same row, so its old name
              slides out and the new one slides in (a fade with reduced
              motion). The key changes only when the recipe does, so editing
              the servings doesn't play it. */}
          <span className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={`${entry.recipe_id ?? entry.food_id ?? ""}:${entry.name}`}
                initial={{ x: 24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -24, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex min-w-0 flex-col"
              >
                <span className="truncate font-medium">{entry.name}</span>
                <span className="text-[13px] text-muted-foreground tabular-nums">
                  {amountText(entry.amount, entry.unit)} ·{" "}
                  <span className={entry.protein_g === null ? undefined : "font-medium text-primary"}>
                    {macroText(entry.protein_g, "g", "protein")}
                  </span>
                </span>
              </motion.span>
            </AnimatePresence>
          </span>
          <span
            className={
              entry.kcal === null
                ? "text-muted-foreground tabular-nums"
                : "whitespace-nowrap tabular-nums"
            }
          >
            {macroText(entry.kcal, "kcal")}
          </span>
        </button>
        {onSwap && (
          <button
            type="button"
            onClick={onSwap}
            aria-label={`Tired of ${entry.name}? Swap it`}
            // So focus can come back here after Undo (see TodayView).
            data-swap-entry={entry.id}
            className="mr-1 flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <Shuffle aria-hidden="true" className="size-4" />
          </button>
        )}
      </motion.div>
    </div>
  );
}
