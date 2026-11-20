"use client";

// The top card of the swap stack, the two cards peeking behind it, and the
// Skip / pick buttons. Swipe, tap or press an arrow key: all three go
// through commit(), so the card always leaves the same way.
//
// How the swipe works: the card's sideways position is a "motion value"
// (x) that follows your finger. The Swap / Skip labels are worked out from
// x, so they fade with it on every frame without React redrawing. The card
// stays flat and level: it only ever moves sideways (no tilt).
// Let go far enough (or flick fast) and it counts: to the left, Skip, and
// the card slides straight off, shrinking and fading a little; to the
// right, pick, and the card springs back while the sheet closes (no
// fly-off, see commit). Otherwise it springs back to the middle.

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from "framer-motion";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DURATION, EASE_OUT, PUSH_FADE, PUSH_SCALE, RUBBER, SCALE_FROM, SPRING, THROW_SPEED } from "@/lib/motion";
import { throwVelocity } from "@/lib/swipe";
import type { RankedSwap } from "@/lib/swap";
import { SwapCard } from "./swap-card";

/** How far (px) to drag before letting go commits. */
const COMMIT_DISTANCE = 96;
/** Or a flick this fast (px per second) away from the middle. */
const COMMIT_SPEED = 600;

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
  /**
   * After the card has left. A pick that saves something (a swap on
   * Today) gives back a promise of "did it work?": on false, the card
   * comes back so you can try again.
   */
  onCommit: (direction: SwapDirection) => void | Promise<boolean>;
}) {
  const reduceMotion = useReducedMotion();
  const pending = pendingLabel !== null;
  const x = useMotionValue(0);
  // Up and down: only ever a rubber-band stretch that springs back (item
  // 10), never a move of its own.
  const y = useMotionValue(0);
  // The card stays flat: no tilt, ever (phone check 2). It only moves
  // sideways, and on Skip also shrinks and fades a little as it slides off,
  // like the Today row's carousel (PUSH_SCALE, PUSH_FADE).
  const scale = useMotionValue(1);
  const opacity = useMotionValue(1);
  const cardRef = useRef<HTMLDivElement>(null);
  const canStretchY = useCanStretchY(cardRef);
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
  // Did this touch become a sideways drag? Framer decides after a few
  // pixels (dragDirectionLock); until then it may still be a scroll.
  const sideways = useRef(false);

  // A new top card starts in the middle again. jump() also STOPS a fly-off
  // still running from the card before (plain set() wouldn't), and a
  // stopped animation never runs its "then", so it can't skip this card
  // too. The buttons stay the same elements from card to card, so focus
  // stays on Skip while you skip through. useLayoutEffect runs before the
  // screen is painted, so the new card never flashes where the old one was.
  useLayoutEffect(() => {
    topId.current = swap.id;
    x.jump(0);
    y.jump(0);
    scale.jump(1);
    opacity.jump(1);
    leaving.current = false;
  }, [swap.id, x, y, scale, opacity]);

  // Closing the sheet mid-flight: stop the animation, so it can't open a
  // recipe (or, on Today, swap your meal) after you said no. `alive` stops
  // a failed swap from bringing back a card that's no longer on screen.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      x.stop();
      y.stop();
      scale.stop();
      opacity.stop();
    };
  }, [x, y, scale, opacity]);

  /**
   * Back to the middle, carrying your finger's speed so it doesn't stall
   * (item 9); with reduced motion, at once. Also after a gesture that
   * doesn't count: Framer only springs the card back by itself after a
   * drag, and after a scroll or a tap that caught it mid-slide it would
   * stay part-way off.
   */
  function toMiddle(velocity = { x: 0, y: 0 }) {
    if (reduceMotion) {
      x.jump(0);
      y.jump(0);
      return;
    }
    animate(x, 0, { ...SPRING.settle, velocity: velocity.x });
    animate(y, 0, { ...SPRING.settle, velocity: velocity.y });
  }

  /** Hand the card over; if a save says it didn't work, bring it back. */
  function finish(direction: SwapDirection, id: string) {
    const result = onCommit(direction);
    if (!result) return;
    void result.then((ok) => {
      if (ok || !alive.current || topId.current !== id) return;
      leaving.current = false;
      // A pick never leaves (see commit), so the card is already in the
      // middle; this only makes sure it's settled there.
      toMiddle();
    });
  }

  /** `velocity`: your finger's speed when you let go; 0 for a tap or a key. */
  function commit(direction: SwapDirection, velocity = { x: 0, y: 0 }) {
    if (leaving.current || pending) return;
    leaving.current = true;
    const id = swap.id;
    // Picking (Swap, or swiped right): no fly-off (phone check 2). Thrown
    // to the right, the card read as the meal going up and right, while on
    // Today the swap moves left. So a card you swiped springs back to the
    // middle while it saves; then the sheet closes and the only movement
    // is Today's row sliding left (meal-push.tsx). If the save fails, the
    // card is already where you can try again.
    if (direction === "pick") {
      toMiddle(velocity);
      finish(direction, id);
      return;
    }
    if (reduceMotion) {
      // No fly-off: the next card cross-fades in instead.
      finish(direction, id);
      return;
    }
    setFlyingId(id);
    // Any up/down stretch goes back as it leaves: it leaves level.
    animate(y, 0, { ...SPRING.settle, velocity: velocity.y });
    // Skip: straight off to the left, flat (item 9). A spring that starts
    // at your finger's speed, so a hard flick doesn't slow down as you let
    // go, and at least THROW_SPEED, so a tap on Skip or ← still sends it
    // off briskly. It counts as gone the moment it's fully past the
    // screen's left edge, not when the spring finally comes to rest, so
    // the next card isn't kept waiting.
    const card = cardRef.current?.getBoundingClientRect();
    const offScreen = x.get() - (card?.right ?? 480);
    // Shrinking and fading a little as it goes, like the Today row's
    // carousel: worked out from how far it has travelled, so the three
    // can't drift apart.
    const stopFollowing = x.on("change", (now) => {
      const share = Math.min(Math.max(now / offScreen, 0), 1);
      scale.set(1 - (1 - PUSH_SCALE) * share);
      opacity.set(1 - (1 - PUSH_FADE) * share);
      if (now > offScreen) return;
      stopFollowing();
      // Stopped here, so nothing moves the card once the next one is up
      // (the old "then" that ran late under next dev and left the next
      // card off-screen, plans/motion.md item 9).
      x.stop();
      // Gone: the card is touchable again if you come Back to it.
      setFlyingId(null);
      if (topId.current === id) finish(direction, id);
    });
    // Aims well past the edge, so it's still going full speed when it
    // crosses it.
    animate(x, offScreen * 2, { ...SPRING.sheet, velocity: throwVelocity(velocity.x, -1, THROW_SPEED) });
  }

  function settle() {
    if (leaving.current) return;
    toMiddle();
  }

  function handleDragEnd(event: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) {
    // Only a gesture locked sideways decides, never one the browser took
    // over to scroll the sheet ("pointercancel"). Framer reports the
    // finger's speed even for a scroll, so a quick scroll that drifts a
    // little sideways would otherwise look like a flick and skip a card
    // or swap your meal. Same fix as Today's swipe row (entry-row.tsx).
    // Up/down (the rubber band) or a scroll: back to the middle, carrying
    // the speed of an up/down pull.
    if (!sideways.current || event.type === "pointercancel") {
      if (!leaving.current) toMiddle({ x: 0, y: velocity.y });
      return;
    }
    // A fast flick only counts towards the side the card is on: pulling
    // back quickly towards the middle means "never mind".
    if (offset.x > COMMIT_DISTANCE || (offset.x > 0 && velocity.x > COMMIT_SPEED)) commit("pick", velocity);
    else if (offset.x < -COMMIT_DISTANCE || (offset.x < 0 && velocity.x < -COMMIT_SPEED))
      commit("skip", velocity);
    // "Never mind": springs back to the middle with your speed.
    else toMiddle(velocity);
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

        {/* Two layers. The outer one plays the entrance; the inner one is
            the card you drag. Kept apart because a touch stops every
            animation on the element you touch: pressed while it was still
            rising, a card that did both would freeze a few px too low.
            A new outer element per card (key), so each one plays it.
            The new top card settles in from scale 0.97, rising the 8 px
            from where the first peeking card was, and fades in. With
            Reduce Motion, MotionProvider skips the scale and y: a fade. */}
        <motion.div
          key={swap.id}
          initial={{ scale: SCALE_FROM, y: 8, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ ...SPRING.sheet, opacity: { duration: DURATION.fast, ease: EASE_OUT } }}
          className="relative z-10"
        >
          <motion.div
            // Not draggable while it flies off: a touch would stop the
            // flight halfway and leave the card stuck.
            // Sideways it follows your finger. Up and down it stretches on
            // a rubber band (RUBBER) and springs back, but only when the
            // sheet has nothing to scroll (or with a mouse): dragging up
            // and down makes the browser stop scrolling the sheet when your
            // finger is on the card, and on a small phone the swap sheet
            // can be taller than the screen. Then up/down keeps scrolling
            // it (Framer sets touch-action: pan-y for a sideways-only drag).
            drag={flying ? false : canStretchY ? true : "x"}
            // Decides which way you meant after a few pixels, and sticks
            // to it: a sideways swipe never drifts up or down.
            dragDirectionLock
            dragElastic={{ left: 0.9, right: 0.9, top: RUBBER, bottom: RUBBER }}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            onPointerDownCapture={() => {
              sideways.current = false;
            }}
            // A press that never became a sideways drag (a tap, a scroll the
            // phone took over) stops any slide still running: put it back.
            onPointerUp={() => {
              if (!sideways.current) settle();
            }}
            onPointerCancel={settle}
            onDirectionLock={(axis) => {
              sideways.current = axis === "x";
            }}
            onDragEnd={handleDragEnd}
            ref={cardRef}
            style={{ x, y, scale, opacity }}
            className={`relative ${flying ? "pointer-events-none" : "cursor-grab active:cursor-grabbing"}`}
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
        </motion.div>
      </div>

      {/* While a pick is saving, both buttons wait. focusableWhenDisabled:
          a plain disabled button drops keyboard focus to the page, so
          after a failed swap you'd start again from the top of the sheet.
          This keeps focus where it was and just ignores the taps. */}
      <div className="flex gap-3">
        <Button
          ref={skipRef}
          variant="outline"
          onClick={() => commit("skip")}
          disabled={pending}
          focusableWhenDisabled
          // Greyed while a swap saves (not faded, so its focus ring stays
          // solid). The Swap button itself stays full colour: its
          // "Swapping…" is the only sign something is happening.
          data-unavailable={pending || undefined}
          aria-label={`Skip ${swap.name}`}
          className="h-12 flex-1 text-base"
        >
          <X aria-hidden="true" className="size-5" />
          Skip
        </Button>
        <Button
          onClick={() => commit("pick")}
          disabled={pending}
          focusableWhenDisabled
          // The visible words come first, so voice control ("tap Open
          // it") matches what's on the button.
          aria-label={pending ? undefined : `${pickLabel}: ${swap.name}`}
          className="h-12 flex-1 text-base"
        >
          <Check aria-hidden="true" className="size-5" />
          {pendingLabel ?? pickLabel}
        </Button>
      </div>
      <p className="mt-2 hidden text-center text-label text-muted-foreground pointer-fine:block">
        ← Skip · {pickLabel} →
      </p>
    </div>
  );
}

/**
 * May the card stretch up and down (item 10)? With a mouse, always. With a
 * finger, only while the sheet it's in has nothing to scroll: otherwise an
 * up/down drag on the card has to keep scrolling the sheet. Measured again
 * whenever the sheet or its content changes size.
 */
function useCanStretchY(cardRef: RefObject<HTMLElement | null>) {
  const [canStretch, setCanStretch] = useState(false);
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    // The nearest box around the card that scrolls up and down: the sheet.
    let scroller: HTMLElement | null = card.parentElement;
    while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) {
      scroller = scroller.parentElement;
    }
    const mouse = window.matchMedia("(pointer: fine)");
    const measure = () =>
      setCanStretch(mouse.matches || !scroller || scroller.scrollHeight <= scroller.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    if (scroller) {
      observer.observe(scroller);
      if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
    }
    mouse.addEventListener("change", measure);
    return () => {
      observer.disconnect();
      mouse.removeEventListener("change", measure);
    };
  }, [cardRef]);
  return canStretch;
}

// A card-shaped sliver behind the top card. Empty and hidden from screen
// readers: it only shows that more cards are waiting. bg-accent: in light
// mode a shade darker than the card, so it reads as behind it. In dark
// mode it's the same grey as the card (both one step up from the sheet,
// surface-raised in globals.css); the offset and border show it's behind.
function Peek({ className }: { className: string }) {
  return <div aria-hidden="true" className={`absolute rounded-2xl border border-border bg-accent ${className}`} />;
}
