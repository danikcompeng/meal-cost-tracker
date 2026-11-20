"use client";

// Smooth height, the cheap way (plans/motion.md, item 5): one wrapper with
// overflow: hidden animates its height. What's inside is laid out once at
// its final size, so text doesn't re-wrap on every frame; it's just
// uncovered. 200 ms, with a fade.
//
// Reduce Motion: heights change at once. Framer Motion's own Reduce Motion
// setting doesn't cover height, so these check it themselves.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
  type AnimationPlaybackControls,
} from "framer-motion";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

const transition = { duration: DURATION.base, ease: EASE_OUT };

/**
 * Opens to its content's height and closes to 0, with a fade. Always on
 * the page; `inert` while closed keeps what's inside out of Tab and screen
 * readers. Starts as it is (no animation when the page loads open).
 */
export function Collapse({
  open,
  id,
  className,
  children,
}: {
  open: boolean;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      id={id}
      initial={false}
      animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
      transition={reduceMotion ? { duration: 0 } : transition}
      className={cn("overflow-hidden", className)}
      inert={!open}
    >
      {children}
    </motion.div>
  );
}

/**
 * For something that appears and goes (put it in an AnimatePresence): the
 * space opens as it fades in, and closes as it fades out.
 * Reduce Motion: a fade only. (Jumping the height would also cut the
 * fade-out short: it'd be 0 px tall before it could fade.)
 */
export function CollapseIn({ className, children }: { className?: string; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const shut = reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 };
  return (
    <motion.div
      initial={shut}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }}
      exit={shut}
      transition={transition}
      className={cn("overflow-hidden", className)}
    >
      {children}
    </motion.div>
  );
}

/**
 * Follows its content's height, but only when `step` changes (the Add
 * sheet going from the list to the amount and back, the next swap card):
 * the box glides from the old height to the new one while the new step
 * fades in. Anything else that changes the height (typing, an error line,
 * which animates itself, the keyboard) just happens, so two height
 * animations never fight.
 *
 * How: the content's height is watched all the time (ResizeObserver),
 * which keeps the height from before a change. When the step changes, a
 * layout effect (before the browser draws the new step) pins the box at
 * the old height and animates it to the new one, then lets go (back to
 * "auto").
 * Reduce Motion: the height changes at once; the new step still fades in.
 */
export function AutoHeight({
  step,
  fade = true,
  children,
}: {
  step?: string;
  /** Off where the new content has its own entrance (the swap card). */
  fade?: boolean;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  // The content's height the last time the browser laid it out.
  const lastHeight = useRef<number | null>(null);
  const running = useRef<AnimationPlaybackControls | null>(null);

  useEffect(() => {
    const element = content.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      lastHeight.current = element.offsetHeight;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Only when the step really changed: not the first time (the sheet
  // opening has its own slide), and not when something else re-runs this.
  const previousStep = useRef(step);
  useLayoutEffect(() => {
    const outer = box.current;
    const inner = content.current;
    if (!outer || !inner || step === previousStep.current) return;
    previousStep.current = step;
    if (fade) animate(inner, { opacity: [0, 1] }, { duration: DURATION.fast, ease: EASE_OUT });
    // Mid-glide, it starts from wherever the box is now.
    const from = running.current ? outer.offsetHeight : lastHeight.current;
    running.current?.stop();
    running.current = null;
    const to = inner.offsetHeight;
    if (reduceMotion || from === null || from === to) {
      outer.style.height = "";
      outer.style.overflowY = "";
      return;
    }
    // Cut off top and bottom only, while it glides ("clip", unlike
    // "hidden", can leave the sides alone): a swap card you're already
    // dragging isn't cut off at the sheet's sides.
    outer.style.overflowY = "clip";
    const controls = animate(outer, { height: [from, to] }, transition);
    running.current = controls;
    controls.then(() => {
      if (running.current !== controls) return;
      running.current = null;
      outer.style.height = "";
      outer.style.overflowY = "";
    });
  }, [step, fade, reduceMotion]);

  return (
    <div ref={box}>
      <div ref={content}>{children}</div>
    </div>
  );
}

// The gap of the stack an error line sits in (space-y-*). A stack puts
// its gap as a margin on the outside of each item, which can't be inside
// the animating box: the 16 px would appear in one jump, then the line
// would slide open. So the line cancels that margin and puts the same
// space inside its own box, where it opens with the line:
// - not the last item: its own gap below becomes padding at its bottom;
// - the last item: the gap the item above it gets (only because this line
//   is there) is cancelled and becomes padding at its top.
// The margins go on the opening box (they're fixed, and cancel out), the
// padding on a box inside it: a box can't be shorter than its own
// padding, so on the opening box it would appear in one jump.
// (group/error: the inside box asks whether the opening box is the last
// item.) Written out in full so Tailwind finds them.
const GAP = {
  "1.5": ["not-last:mb-0 last:-mt-1.5", "group-not-last/error:pb-1.5 group-last/error:pt-1.5"],
  "2": ["not-last:mb-0 last:-mt-2", "group-not-last/error:pb-2 group-last/error:pt-2"],
  "3": ["not-last:mb-0 last:-mt-3", "group-not-last/error:pb-3 group-last/error:pt-3"],
  "4": ["not-last:mb-0 last:-mt-4", "group-not-last/error:pb-4 group-last/error:pt-4"],
  "5": ["not-last:mb-0 last:-mt-5", "group-not-last/error:pb-5 group-last/error:pt-5"],
  "6": ["not-last:mb-0 last:-mt-6", "group-not-last/error:pb-6 group-last/error:pt-6"],
} as const;

/**
 * A red error line that opens its space and fades in, and closes when it
 * goes. Each time it appears it's a new line on the page, so a screen
 * reader reads it out again even when the words are the same as before
 * (forms hide it while saving again, then show the new answer).
 */
export function ErrorLine({
  show,
  gap,
  id,
  alert = true,
  className,
  after,
  boxClassName,
  children,
}: {
  show: boolean;
  /** The gap of the stack it's in, as in space-y-4 → "4". None outside a stack. */
  gap?: keyof typeof GAP;
  /** So a box can point at it (aria-describedby). */
  id?: string;
  /**
   * role="alert": read out as soon as it appears. Off under a box: focus
   * moves to the box after Save, which reads it, and an alert as well
   * would read it twice.
   */
  alert?: boolean;
  className?: string;
  /** Under the line, opening and closing with it, but not read out with it (a link). */
  after?: React.ReactNode;
  /**
   * For the opening box itself. Tucked up under the box above it:
   * "relative -top-3" draws it 12 px higher without moving anything else
   * (a negative margin would jump, or be cut off inside). Space around the
   * line goes in its own padding (className), never a margin, so it opens
   * with the line.
   */
  boxClassName?: string;
  children: React.ReactNode;
}) {
  const role = alert ? "alert" : undefined;
  // A new key each time it appears again: a new line, read out again.
  // (Setting state while rendering: React's pattern for following a prop.)
  const [shown, setShown] = useState(show);
  const [count, setCount] = useState(0);
  if (show !== shown) {
    setShown(show);
    if (show) setCount(count + 1);
  }
  return (
    <AnimatePresence initial={false}>
      {show && (
        <CollapseIn key={count} className={cn("group/error", gap && GAP[gap][0], boxClassName)}>
          <div className={gap && GAP[gap][1]}>
            <Line id={id} role={role} className={className}>
              {children}
            </Line>
            {after}
          </div>
        </CollapseIn>
      )}
    </AnimatePresence>
  );
}

function Line({
  id,
  role,
  className,
  children,
}: {
  id?: string;
  role?: "alert";
  className?: string;
  children: React.ReactNode;
}) {
  // While it's closing, a new line may already be opening below it with
  // the same id: the closing one gives up its id and role, so the box
  // points at the new one and only the new one is read out.
  const isPresent = useIsPresent();
  return (
    <p
      id={isPresent ? id : undefined}
      role={isPresent ? role : undefined}
      aria-hidden={isPresent ? undefined : true}
      className={cn("text-sm text-destructive", className)}
    >
      {children}
    </p>
  );
}
