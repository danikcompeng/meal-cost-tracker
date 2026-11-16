"use client";

import { useCallback, useEffect, useRef } from "react";
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
import { Shuffle } from "lucide-react";
import { macroText } from "@/lib/macros";
import { REVEAL, restsOpen } from "@/lib/swipe";
import type { MealEntry } from "@/lib/types";
import { amountText } from "@/lib/units";

/** Quick, with no bounce past the button. */
const SNAP = { type: "spring", stiffness: 500, damping: 42 } as const;

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
// Swipe left to open it, like iPhone Mail: the row slides over and uncovers
// a red Delete button at its right end. Deleting always takes a tap on
// that button (no full-swipe delete); Undo then shows above the tab bar.
// Swipe back, tap the row, or tap anywhere else to shut it (TodayView keeps
// which row is open, so only one is). Swiping is a shortcut: keyboards and
// screen readers use Delete in the edit sheet, so the button is hidden
// from them while the row is shut.
export function EntryRow({
  entry,
  open,
  onOpenChange,
  onOpen,
  onSwap,
  onDelete,
}: {
  entry: MealEntry;
  /** Slid open, showing its Delete button. */
  open: boolean;
  /** You opened or shut it yourself (a swipe, or a tap on the open row). */
  onOpenChange: (open: boolean) => void;
  onOpen: () => void;
  /** Only for recipe entries: opens the swap stack. */
  onSwap?: () => void;
  /** Delete tapped. The page hides the row at once and deletes it. */
  onDelete: () => void;
}) {
  const reduceMotion = useReducedMotion();
  // The row's sideways position: follows your finger, rests at 0 (shut)
  // or -REVEAL (open).
  const x = useMotionValue(0);
  // The row and its button together, sliding off after Delete.
  const away = useMotionValue(0);
  // The button is invisible while the row is shut, so no red shows at the
  // row's rounded corners; it appears as soon as the row moves.
  const buttonOpacity = useTransform(x, [-4, 0], [1, 0]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Can't be deleted twice (two quick taps on Delete).
  const leaving = useRef(false);
  // Did this touch become a sideways swipe? Framer decides after about
  // 10 px (dragDirectionLock). Until then it may still be a tap or a
  // scroll, and only a sideways one may open or shut the row or cancel the
  // tap. (Framer reports the finger's speed even for a scroll, so a quick
  // scroll that drifts a little left would otherwise look like a flick.)
  const sideways = useRef(false);
  // The latest `open`, for handlers that run before the next redraw.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  });

  /** Slide to open or shut; with reduced motion, jump there. */
  const settle = useCallback(
    (toOpen: boolean) => {
      const target = toOpen ? -REVEAL : 0;
      if (reduceMotion) x.jump(target);
      else animate(x, target, SNAP);
    },
    [reduceMotion, x],
  );

  // Opened or shut by the page (another row opened, a tap elsewhere, a
  // scroll) or by your own swipe: move there.
  useEffect(() => {
    settle(open);
  }, [open, settle]);

  // false while the row fades out after a delete. If it comes back before
  // it's gone (the delete failed, or a quick Undo), it's the same row, so
  // put it back in place, shut.
  const isPresent = useIsPresent();
  useEffect(() => {
    if (!isPresent) return;
    x.jump(0);
    away.jump(0);
    leaving.current = false;
  }, [isPresent, x, away]);

  function handleDragEnd(event: MouseEvent | TouchEvent | PointerEvent, { velocity }: PanInfo) {
    // Only a gesture locked sideways decides, never one the browser took
    // over to scroll ("pointercancel"): then the row just goes back.
    if (!sideways.current || event.type === "pointercancel") {
      settle(openRef.current);
      return;
    }
    const toOpen = restsOpen(x.get(), velocity.x);
    settle(toOpen);
    if (toOpen !== openRef.current) onOpenChange(toOpen);
  }

  function handleDelete() {
    if (leaving.current) return;
    leaving.current = true;
    // Row and button slide off to the left while the row fades and the
    // rows below close up (MealSection). With reduced motion: only the fade.
    if (!reduceMotion) {
      const width = wrapperRef.current?.offsetWidth ?? 320;
      animate(away, -(width + 32), { duration: 0.2, ease: "easeIn" });
    }
    onDelete();
  }

  return (
    <motion.div
      ref={wrapperRef}
      // TodayView: a tap inside the open row isn't a "tap elsewhere".
      data-entry-row={entry.id}
      style={{ x: away }}
      className="relative overflow-hidden rounded-lg"
    >
      <motion.div
        // Not while it's leaving: a touch would stop it halfway.
        drag={isPresent ? "x" : false}
        // Framer sets touch-action: pan-y for a sideways drag, so the day
        // still scrolls with your finger on a row; this decides which way
        // you meant after a few pixels.
        dragDirectionLock
        // Between shut (0) and open (the button's width), with a little
        // give past the button and none to the right: no full swipe.
        dragConstraints={{ left: -REVEAL, right: 0 }}
        dragElastic={{ left: 0.1, right: 0 }}
        // No coasting after you let go: settle() decides where it rests.
        dragMomentum={false}
        onPointerDownCapture={() => {
          sideways.current = false;
        }}
        // Pressing the row stops a slide that's still running; a tap (no
        // swipe) would otherwise leave it stuck halfway.
        onPointerUp={() => {
          if (!sideways.current) settle(openRef.current);
        }}
        // Same when the phone takes the press over (a scroll, a long
        // press) before it counts as a drag: nothing else would finish it.
        onPointerCancel={() => settle(openRef.current)}
        onDirectionLock={(axis) => {
          sideways.current = axis === "x";
        }}
        onDragEnd={handleDragEnd}
        onClickCapture={(e) => {
          // From the keyboard (Enter, detail 0): always goes through to
          // the edit sheet, shutting the row on the way.
          if (e.detail === 0) {
            if (openRef.current) onOpenChange(false);
            return;
          }
          // A swipe isn't also a tap: the browser may still send a click
          // to the button you started on when you let go.
          const swiped = sideways.current;
          // Tapping the open row (or its swap icon) shuts it instead.
          const shutting = !swiped && openRef.current;
          if (!swiped && !shutting) return;
          e.preventDefault();
          e.stopPropagation();
          if (shutting) onOpenChange(false);
        }}
        style={{ x }}
        // Solid and on top (z-10), so the button only shows where the row
        // has moved away.
        className="relative z-10 flex items-center rounded-lg bg-background transition-colors hover:bg-accent"
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
      {/* Behind the row's right end; after it on the page, so Tab and
          screen readers reach it after the row, matching where it sits.
          inert while shut: not focusable and hidden from screen readers
          (they use Delete in the edit sheet). Open, it's a real button
          with the food's name in its label. */}
      <div inert={!open} style={{ width: REVEAL }} className="absolute inset-y-0 right-0 flex">
        <motion.button
          type="button"
          onClick={handleDelete}
          aria-label={`Delete ${entry.name}`}
          data-row-delete=""
          style={{ opacity: buttonOpacity }}
          // text-primary-foreground: white on the light red, near-black on
          // dark mode's lighter red (both pass 4.5:1; see plans/polish.md).
          // The focus ring is the same colour: matcha wouldn't show on red.
          className="flex-1 bg-destructive font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-primary-foreground focus-visible:ring-inset"
        >
          Delete
        </motion.button>
      </div>
    </motion.div>
  );
}
