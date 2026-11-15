"use client";

// The top card of the swap stack, the two cards peeking behind it, and the
// Skip / pick buttons. Swipe, tap or press an arrow key: all three go
// through commit(), so the card always leaves the same way.
//
// How the swipe works: the card's sideways position is a "motion value"
// (x) that follows your finger. Tilt and the Swap / Skip labels are worked
// out from x, so they move with it on every frame without React redrawing.
// Let go far enough (or flick fast) and the card flies off that side;
// otherwise it springs back to the middle.

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from "framer-motion";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RankedSwap } from "@/lib/swap";
import { SwapCard } from "./swap-card";

/** How far (px) to drag before letting go commits. */
const COMMIT_DISTANCE = 96;
/** Or a flick this fast (px per second) away from the middle. */
const COMMIT_SPEED = 600;
/** Most the card tilts, in degrees, at a full drag. */
const MAX_TILT = 8;

export type SwapDirection = "skip" | "pick";

export function SwapStack({
  swap,
  servings,
  behind,
  pickLabel,
  dragLabel,
  pendingLabel = null,
  skipRef,
  onCommit,
}: {
  swap: RankedSwap;
  servings: number;
  /** How many cards peek out behind this one (0, 1 or 2). */
  behind: number;
  /** "Swap to this" on Today, "Open it" on a recipe screen. */
  pickLabel: string;
  /** The short word on the card while you drag right: "Swap", "Open". */
  dragLabel: string;
  /** Set while the pick is under way ("Opening…"): the buttons wait. */
  pendingLabel?: string | null;
  /** So the sheet can put keyboard focus on Skip (after Back or Start over). */
  skipRef: RefObject<HTMLButtonElement | null>;
  onCommit: (direction: SwapDirection) => void;
}) {
  const reduceMotion = useReducedMotion();
  const pending = pendingLabel !== null;
  const x = useMotionValue(0);
  // With reduced motion the card still follows your finger (you're moving
  // it yourself), but it doesn't tilt.
  const rotate = useTransform(x, [-200, 200], reduceMotion ? [0, 0] : [-MAX_TILT, MAX_TILT]);
  const pickOpacity = useTransform(x, [16, COMMIT_DISTANCE], [0, 1]);
  const skipOpacity = useTransform(x, [-COMMIT_DISTANCE, -16], [1, 0]);

  // Which card is on top right now. The fly-off checks it when it lands,
  // so a card that's no longer on top (you pressed Back meanwhile) can't
  // move the stack on.
  const topId = useRef(swap.id);
  // A card mid-flight can't be committed twice (a swipe, then a tap). The
  // ref answers instantly; the state redraws the card as untouchable.
  const leaving = useRef(false);
  const [flyingId, setFlyingId] = useState<string | null>(null);
  const flying = flyingId === swap.id;

  // A new top card starts in the middle again. jump() also STOPS a fly-off
  // still running from the card before (plain set() wouldn't), and a
  // stopped animation never runs its "then", so it can't skip this card
  // too. The buttons stay the same elements from card to card, so focus
  // stays on Skip while you skip through. useLayoutEffect runs before the
  // screen is painted, so the new card never flashes where the old one was.
  useLayoutEffect(() => {
    topId.current = swap.id;
    x.jump(0);
    leaving.current = false;
  }, [swap.id, x]);

  // Closing the sheet mid-flight: stop the animation, so it can't open a
  // recipe (or, on Today, swap your meal) after you said no.
  useEffect(() => () => x.stop(), [x]);

  function commit(direction: SwapDirection) {
    if (leaving.current || pending) return;
    leaving.current = true;
    if (reduceMotion) {
      // No fly-off: the next card cross-fades in instead.
      onCommit(direction);
      return;
    }
    const id = swap.id;
    setFlyingId(id);
    const side = direction === "pick" ? 1 : -1;
    // Far enough to be off any phone screen, quick enough to feel snappy.
    animate(x, side * Math.max(window.innerWidth, 480), { duration: 0.22, ease: "easeIn" }).then(() => {
      // Landed: the card is touchable again if you come Back to it.
      setFlyingId(null);
      if (topId.current === id) onCommit(direction);
    });
  }

  function handleDragEnd(_: unknown, { offset, velocity }: PanInfo) {
    // A fast flick only counts towards the side the card is on: pulling
    // back quickly towards the middle means "never mind".
    if (offset.x > COMMIT_DISTANCE || (offset.x > 0 && velocity.x > COMMIT_SPEED)) commit("pick");
    else if (offset.x < -COMMIT_DISTANCE || (offset.x < 0 && velocity.x < -COMMIT_SPEED)) commit("skip");
    // Otherwise nothing to do: dragConstraints (0, 0) springs it back.
  }

  // Arrow keys: ← skip, → pick. Only while this stack is on screen, not
  // with Ctrl / Alt / Cmd / Shift held (browser shortcuts), and not for a
  // held-down key repeating ~30 times a second, which would race through
  // the whole stack. The ref always holds the latest commit(), so the
  // listener can stay put.
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.repeat || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
      if (e.key === "ArrowLeft") commitRef.current("skip");
      else if (e.key === "ArrowRight") commitRef.current("pick");
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div>
      {/* Room under the card for the ones peeking out behind it. */}
      <div className="relative mb-6">
        {behind >= 2 && <Peek className="inset-x-6 top-4 -bottom-4" />}
        {behind >= 1 && <Peek className="inset-x-3 top-2 -bottom-2" />}

        <motion.div
          // A new element per card, so each one plays the "grow from the
          // stack" entrance below.
          key={swap.id}
          // Not draggable while it flies off: a touch would stop the
          // flight halfway and leave the card stuck.
          drag={flying ? false : "x"}
          // Framer sets touch-action: pan-y for a sideways drag, so you can
          // still scroll the sheet with your finger on the card; this
          // decides which way you meant after a few pixels.
          dragDirectionLock
          dragElastic={0.9}
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          style={{ x, rotate }}
          // The new top card grows from the stack (or just fades in when
          // motion is reduced: MotionConfig then skips the scale and y).
          initial={{ scale: 0.95, y: 8, opacity: reduceMotion ? 0 : 1 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={reduceMotion ? { duration: 0.15 } : { type: "spring", stiffness: 380, damping: 30 }}
          className={`relative z-10 ${flying ? "pointer-events-none" : "cursor-grab active:cursor-grabbing"}`}
        >
          <SwapCard swap={swap} servings={servings} />
          {/* Labels that fade in as you drag. Hidden from screen readers:
              the buttons below say the same thing. */}
          <motion.span
            aria-hidden="true"
            style={{ opacity: pickOpacity }}
            className="pointer-events-none absolute top-4 left-4 rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground"
          >
            {dragLabel}
          </motion.span>
          <motion.span
            aria-hidden="true"
            style={{ opacity: skipOpacity }}
            className="pointer-events-none absolute top-4 right-4 rounded-full border border-border bg-background px-3 py-1 text-sm font-semibold text-muted-foreground"
          >
            Skip
          </motion.span>
        </motion.div>
      </div>

      <div className="flex gap-3">
        <Button
          ref={skipRef}
          variant="outline"
          onClick={() => commit("skip")}
          disabled={pending}
          aria-label={`Skip ${swap.name}`}
          className="h-12 flex-1 text-base"
        >
          <X aria-hidden="true" className="size-5" />
          Skip
        </Button>
        <Button
          onClick={() => commit("pick")}
          disabled={pending}
          // The visible words come first, so voice control ("tap Open
          // it") matches what's on the button.
          aria-label={pending ? undefined : `${pickLabel}: ${swap.name}`}
          className="h-12 flex-1 text-base"
        >
          <Check aria-hidden="true" className="size-5" />
          {pendingLabel ?? pickLabel}
        </Button>
      </div>
      <p className="mt-2 hidden text-center text-[13px] text-muted-foreground pointer-fine:block">
        ← Skip · {pickLabel} →
      </p>
    </div>
  );
}

// A card-shaped sliver behind the top card. Empty and hidden from screen
// readers: it only shows that more cards are waiting. The border keeps it
// visible in dark mode, where tiles and the sheet are close in colour.
function Peek({ className }: { className: string }) {
  return <div aria-hidden="true" className={`absolute rounded-2xl border border-border bg-accent ${className}`} />;
}
