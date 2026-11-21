"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  animate,
  motion,
  useIsPresent,
  useMotionValue,
  usePresenceData,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { Shuffle, Trash2 } from "lucide-react";
import { DURATION, EASE_IN, RUBBER, SPRING } from "@/lib/motion";
import { REVEAL, restsOpen } from "@/lib/swipe";
import type { MealEntry } from "@/lib/types";
import { untilSheetClosed } from "./bottom-sheet";
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

  /**
   * Slide to open or shut; with reduced motion, jump there.
   * `velocity`: your finger's speed when you let go (px/s). The spring
   * starts at that speed (plans/motion.md, item 9), so a quick flick shoots
   * open and settles while a slow push eases in. Past a limit (pulled right
   * of shut, or left of Delete) it springs back with a hint of bounce
   * (SPRING.settle); otherwise it snaps (SPRING.snap).
   * `keepIfHeading`: only for the page confirming the open you just
   * swiped. If our spring is already heading there it's left alone,
   * because starting again would measure the speed afresh and lose the
   * flick. Nothing else skips: x can also be moving by Framer's own
   * release bounce (a touch the phone cancelled), which must be replaced.
   * A row that's leaving (deleted) is never moved back by this.
   */
  const heading = useRef<number | null>(null);
  const present = useRef(true);
  const settle = useCallback(
    (toOpen: boolean, velocity?: number, keepIfHeading = false) => {
      if (!present.current) return;
      const target = toOpen ? -REVEAL : 0;
      if (reduceMotion) {
        x.jump(target);
        return;
      }
      if (keepIfHeading && x.isAnimating() && heading.current === target) return;
      heading.current = target;
      const now = x.get();
      const pastLimit = now > 0 || now < -REVEAL;
      animate(x, target, { ...(pastLimit ? SPRING.settle : SPRING.snap), velocity: velocity ?? x.getVelocity() });
    },
    [reduceMotion, x],
  );

  // Opened or shut by the page (another row opened, a tap elsewhere, a
  // scroll) or by your own swipe: move there.
  useEffect(() => {
    settle(open, undefined, true);
  }, [open, settle]);

  // false while the row leaves after a delete.
  const isPresent = useIsPresent();
  // Today's answer to "does this deleted row slide off?" (MealSection
  // passes it to every leaving row): yes after either Delete, the row's
  // red one or the edit sheet's.
  const willSlide = usePresenceData() as ((id: string) => boolean) | undefined;
  useEffect(() => {
    present.current = isPresent;
    if (!isPresent) {
      // Like iPhone Mail: the row slides left, off the screen, from
      // wherever it is (open after a swipe, shut after the edit sheet),
      // and the red glued to its right edge fills the space it leaves.
      // Then the red closes up (MealSection waits DURATION.slow for that:
      // change both together). After the edit sheet's Delete it first
      // waits for the sheet to slide down, so you see it (same wait in
      // MealSection). With reduced motion: no slide, it fades.
      if (reduceMotion || !willSlide?.(entry.id)) return;
      const width = wrapperRef.current?.offsetWidth ?? 320;
      animate(x, -width, { duration: DURATION.slow, ease: EASE_IN, delay: untilSheetClosed() / 1000 });
      return;
    }
    // Back before it's gone (the delete failed, or a quick Undo): it's the
    // same row, so put it back in place, shut.
    x.jump(0);
    leaving.current = false;
  }, [isPresent, x, reduceMotion, willSlide, entry.id]);

  function handleDragEnd(event: MouseEvent | TouchEvent | PointerEvent, { velocity }: PanInfo) {
    setDragging(false);
    // Only a gesture locked sideways decides, never one the browser took
    // over to scroll ("pointercancel"): then the row just goes back.
    if (!sideways.current || event.type === "pointercancel") {
      settle(openRef.current);
      return;
    }
    const toOpen = restsOpen(x.get(), velocity.x);
    // Carries your finger's speed into the spring.
    settle(toOpen, velocity.x);
    if (toOpen !== openRef.current) onOpenChange(toOpen);
  }

  function handleDelete() {
    if (leaving.current) return;
    leaving.current = true;
    // Today hides the row; it slides off as it leaves (the effect above).
    onDelete();
  }

  return (
    <div
      ref={wrapperRef}
      // TodayView: a tap inside the open row isn't a "tap elsewhere".
      data-entry-row={entry.id}
      // isolate: the row's z-10 below only counts inside this box, so a
      // row can never come up over the tab bar (globals.css, Layers).
      className="relative isolate overflow-hidden rounded-lg"
    >
      <motion.div
        ref={rowRef}
        // Not while it's leaving: a touch would stop it halfway.
        drag={isPresent ? "x" : false}
        // Framer sets touch-action: pan-y for a sideways drag, so the day
        // still scrolls with your finger on a row; this decides which way
        // you meant after a few pixels.
        dragDirectionLock
        // Between shut (0) and open (the button's width). Past either end
        // it still follows your finger, but on a rubber band (RUBBER: 1 px
        // for every 5), and springs back when you let go (settle): pulled
        // right while shut, or left past Delete. No full swipe to delete.
        // With Reduce Motion it still stretches (your finger moves it) and
        // goes back at once.
        dragConstraints={{ left: -REVEAL, right: 0 }}
        dragElastic={RUBBER}
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
          // dark mode's lighter red (both pass 4.5:1; see plans/polish.md),
          // for the trash can too. The focus ring is the same colour:
          // matcha wouldn't show on red.
          className="flex flex-1 items-center justify-center bg-destructive text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-primary-foreground focus-visible:ring-inset"
        >
          {/* A trash can, not the word (phone check 2). The button's label
              still says it in words: "Delete Beef and rice". */}
          <Trash2 aria-hidden="true" className="size-5" />
        </motion.button>
      </div>
    </div>
  );
}
