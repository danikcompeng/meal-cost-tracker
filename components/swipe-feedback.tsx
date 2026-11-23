"use client";

// What a swap card shows while you drag it (CLAUDE.md, Design > Motion).
// Right: the card turns a soft matcha and a big check with "Swap" fades in
// at its centre. Left: the same in neutral grey, with an ✕ and "Skip".
// Both grow with the drag and are full strength exactly when letting go
// would count; there the sign pops once, so you feel it lock in. Let go
// before that and the card springs back, taking all of it with it.
//
// Everything is worked out from the card's position (x) by
// swipeFeedback in lib/swipe.ts, on every frame, without React redrawing.
// Only a finger shows it (byFinger): a tap on Skip throws the card off
// through the same positions, plainly. Hidden from screen readers: the
// Skip and Swap buttons say the same.

import { useRef } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Check, X } from "lucide-react";
import { DURATION, EASE_OUT, POP_SCALE } from "@/lib/motion";
import { swipeFeedback, type SwipeFeedback } from "@/lib/swipe";

type Props = {
  /** The card's sideways position, px (right positive). */
  x: MotionValue<number>;
  /** 1 while a finger moves the card, 0 when a button or key threw it. */
  byFinger: MotionValue<number>;
  /** Where letting go starts to count (LOCK_AT). */
  lockAt: number;
};

/** How strongly to show `side`: 0 to 1. */
function useStrength({ x, byFinger, lockAt }: Props, side: SwipeFeedback["side"]) {
  return useTransform([x, byFinger], ([now, finger]: number[]) => {
    const feedback = swipeFeedback(now, lockAt);
    return feedback.side === side ? feedback.share * finger : 0;
  });
}

/**
 * The tint, behind the card's text (SwapCard puts it there): a soft
 * matcha to the right, a grey to the left. The colours are tokens
 * (--swipe-pick, --swipe-skip), as strong as they can be with the text on
 * them still 4.5:1.
 */
export function SwipeTint(props: Props) {
  const pick = useStrength(props, "pick");
  const skip = useStrength(props, "skip");
  return (
    <>
      <motion.div aria-hidden="true" style={{ opacity: pick }} className="absolute inset-0 bg-swipe-pick" />
      <motion.div aria-hidden="true" style={{ opacity: skip }} className="absolute inset-0 bg-swipe-skip" />
    </>
  );
}

/** The big sign at the card's centre: check + "Swap" (or "Open"), or ✕ + "Skip". */
export function SwipeSign({
  pickLabel,
  ...props
}: Props & {
  /** "Swap" on Today, "Open" on a recipe screen. */
  pickLabel: string;
}) {
  const { x, byFinger, lockAt } = props;
  const reduceMotion = useReducedMotion();
  const pick = useStrength(props, "pick");
  const skip = useStrength(props, "skip");
  // The pop, shared by both signs: only one shows at a time.
  const pop = useMotionValue(1);
  // Locked on the last frame? The pop plays once, as you cross the line,
  // not on every frame past it. Coming back under it and out again pops
  // again: it locked in again.
  const wasLocked = useRef(false);
  useMotionValueEvent(x, "change", (now) => {
    const { locked } = swipeFeedback(now, lockAt);
    if (locked && !wasLocked.current && byFinger.get() === 1 && !reduceMotion) {
      animate(pop, [1, POP_SCALE, 1], { duration: DURATION.base, ease: EASE_OUT });
    }
    wasLocked.current = locked;
  });

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <Sign
        opacity={pick}
        pop={pop}
        icon={<Check className="size-8" strokeWidth={2.5} />}
        label={pickLabel}
        tone="pick"
      />
      <Sign opacity={skip} pop={pop} icon={<X className="size-8" strokeWidth={2.5} />} label="Skip" tone="skip" />
    </div>
  );
}

// Solid, so their own contrast never depends on the card's text behind
// them: Swap is the matcha button's pair, Skip the page colour on the
// grey label colour (both checked in lib/color.test.ts).
const TONE = {
  pick: "bg-primary text-primary-foreground",
  skip: "bg-muted-foreground text-background",
};

function Sign({
  opacity,
  pop,
  icon,
  label,
  tone,
}: {
  opacity: MotionValue<number>;
  pop: MotionValue<number>;
  icon: React.ReactNode;
  label: string;
  tone: keyof typeof TONE;
}) {
  return (
    <motion.div style={{ opacity }} className="absolute inset-0 flex flex-col items-center justify-center gap-2">
      <motion.div style={{ scale: pop }} className={`grid size-16 place-items-center rounded-full ${TONE[tone]}`}>
        {icon}
      </motion.div>
      <span className={`rounded-full px-3 py-1 text-sm font-medium ${TONE[tone]}`}>{label}</span>
    </motion.div>
  );
}
