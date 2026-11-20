"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  animate,
  motion,
  useIsPresent,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { Shuffle } from "lucide-react";
import { DURATION, EASE_IN, SPRING } from "@/lib/motion";
import { REVEAL, restsOpen } from "@/lib/swipe";
import type { MealEntry } from "@/lib/types";
import { MealPush } from "./meal-push";

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
  // or -REVEAL (open), and after Delete keeps going, off the left edge.
  const x = useMotionValue(0);
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
  // The sliding part of the row. While it's being swiped it carries
  // data-dragging, which switches off its press shrink (globals.css):
  // otherwise the row would stay shrunk for the whole swipe. Set straight
  // on the element, not with state, so a swipe never redraws the row.
  const rowRef = useRef<HTMLDivElement>(null);
  const setDragging = (on: boolean) => {
    if (on) rowRef.current?.setAttribute("data-dragging", "");
    else rowRef.current?.removeAttribute("data-dragging");
  };
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
      else animate(x, target, SPRING.snap);
    },
    [reduceMotion, x],
  );

  // Opened or shut by the page (another row opened, a tap elsewhere, a
  // scroll) or by your own swipe: move there.
  useEffect(() => {
    settle(open);
  }, [open, settle]);

  // false while the row leaves after a delete. If it comes back before
  // it's gone (the delete failed, or a quick Undo), it's the same row, so
  // put it back in place, shut.
  const isPresent = useIsPresent();
  useEffect(() => {
    if (!isPresent) return;
    x.jump(0);
    leaving.current = false;
  }, [isPresent, x]);

  function handleDragEnd(event: MouseEvent | TouchEvent | PointerEvent, { velocity }: PanInfo) {
    setDragging(false);
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
    // Like iPhone Mail: the row keeps sliding left, off the screen, and
    // the red behind it fills the space it leaves. Then, once it's gone,
    // the red closes up (MealSection waits DURATION.slow for that: change
    // both together). With reduced motion: no slide, the row just fades.
    if (!reduceMotion) {
      const width = wrapperRef.current?.offsetWidth ?? 320;
      animate(x, -width, { duration: DURATION.slow, ease: EASE_IN });
    }
    onDelete();
  }

  return (
    <div
      ref={wrapperRef}
      // TodayView: a tap inside the open row isn't a "tap elsewhere".
      data-entry-row={entry.id}
      className="relative overflow-hidden rounded-lg"
    >
      <motion.div
        ref={rowRef}
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
          setDragging(false);
        }}
        // Pressing the row stops a slide that's still running; a tap (no
        // swipe) would otherwise leave it stuck halfway.
        onPointerUp={() => {
          setDragging(false);
          if (!sideways.current) settle(openRef.current);
        }}
        // Same when the phone takes the press over (a scroll, a long
        // press) before it counts as a drag: nothing else would finish it.
        onPointerCancel={() => {
          setDragging(false);
          settle(openRef.current);
        }}
        onDirectionLock={(axis) => {
          sideways.current = axis === "x";
          if (sideways.current) setDragging(true);
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
        // The press shrink (0.985, the wide-row token) is the whole row's,
        // but only while its main button is pressed (the swap icon has its
        // own), never while it's being swiped, and not with Reduce Motion.
        className="relative z-10 flex items-center rounded-lg bg-background transition-[background-color,scale] duration-(--motion-fast) ease-(--motion-ease-out) hover:bg-accent motion-safe:not-data-dragging:has-[>[data-entry-open]:active]:scale-(--motion-press-scale-wide)"
      >
        <button
          type="button"
          onClick={onOpen}
          // So focus can come back here after Undo (see TodayView).
          data-entry-open={entry.id}
          // Inset: the meal's list hides anything outside a row.
          className="focus-ring-inset flex min-h-14 min-w-0 flex-1 rounded-lg text-left"
        >
          {/* After a swap the old meal slides out left and the new one in
              from the right, as one strip (meal-push.tsx). */}
          <MealPush entry={entry} />
        </button>
        {onSwap && (
          <button
            type="button"
            onClick={onSwap}
            aria-label={`Tired of ${entry.name}? Swap it`}
            // So focus can come back here after Undo (see TodayView).
            data-swap-entry={entry.id}
            className="focus-ring-inset press mr-1 flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <Shuffle aria-hidden="true" className="size-4" />
          </button>
        )}
      </motion.div>
      {/* The red that fills in behind the row as it moves: its left edge
          is glued to the row's right edge (same x), and it's a whole row
          wide, so wherever the row goes the space it leaves is red, out to
          the right end. While shut it's just past the right edge, hidden by
          overflow-hidden. Only moved, never resized (transform only). */}
      <motion.div
        aria-hidden="true"
        style={{ x }}
        className="absolute inset-y-0 left-full w-full bg-destructive"
      />
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
    </div>
  );
}
