// Swipe to reveal on a Today row (like iPhone Mail): where the row rests
// after you let go. And the swap card: what it shows while you drag it,
// whether letting go counts, and how fast a skipped card is thrown off.
// Pure, so they can be unit tested.

/** How far an open row slides: the Delete button's width, in px. */
export const REVEAL = 88;
/** Let go with the row past this share of REVEAL and it stays open. */
export const OPEN_SHARE = 1 / 3;
/** Or a flick this fast (px per second) opens or shuts it, that way. */
export const FLICK_SPEED = 500;

/**
 * Should the row stay open? `position` is where the row is when you let go
 * (0 = shut, -REVEAL = open, a little further with the give), `velocity`
 * how fast your finger was moving sideways (negative = left).
 * A quick flick goes the way you flicked; otherwise it's where you let go:
 * past a third of the button's width stays open, less snaps shut. The same
 * rule from either end, so swiping an open row back closes it.
 */
export function restsOpen(position: number, velocity: number): boolean {
  if (velocity < -FLICK_SPEED) return true;
  if (velocity > FLICK_SPEED) return false;
  return position < -REVEAL * OPEN_SHARE;
}

/** How far (px) your finger drags a swap card before letting go counts. */
export const COMMIT_DISTANCE = 96;
/**
 * Sideways, a swap card follows 0.9 of your finger (Framer's dragElastic:
 * it has nowhere to go, so all of it is give).
 */
export const SIDEWAYS_GIVE = 0.9;
/**
 * Where the card is (x, px) after your finger has gone COMMIT_DISTANCE
 * from rest: past this, letting go counts, and the swipe sign locks in.
 */
export const LOCK_AT = COMMIT_DISTANCE * SIDEWAYS_GIVE;
/** Or a flick this fast (px per second) away from the middle counts too. */
export const COMMIT_SPEED = 600;

/**
 * Does letting go of a swap card count, and which way? Decided from where
 * the card is (`position`, its x when you let go), the same number the
 * sign is drawn from (swipeFeedback), so a sign at full strength always
 * means "this counts". (Deciding from how far the finger moved disagreed
 * with the sign when you grabbed a card still springing back.) A fast
 * flick counts too, but only towards the side the card is on: pulling
 * back quickly towards the middle means "never mind".
 */
export function releaseSide(position: number, velocity: number): "pick" | "skip" | null {
  if (position > LOCK_AT || (position > 0 && velocity > COMMIT_SPEED)) return "pick";
  if (position < -LOCK_AT || (position < 0 && velocity < -COMMIT_SPEED)) return "skip";
  return null;
}

/** A swap card shows nothing until it's this far (px) off the middle, so a tap's wobble stays quiet. */
export const FEEDBACK_START = 16;

export type SwipeFeedback = {
  /** Which way the card is out: right = "pick", left = "skip", or neither yet. */
  side: "pick" | "skip" | null;
  /** How strongly to show it: 0 at FEEDBACK_START, 1 at the lock, never more. */
  share: number;
  /** Past the lock: letting go now counts. */
  locked: boolean;
};

/**
 * What a swap card shows while you drag it (swipe-feedback.tsx): the tint
 * and the big Swap / Skip sign grow with `x` (px off the middle, right
 * positive) and are full strength exactly when letting go would count
 * (`lockAt`, px). The sign pops once as it crosses that line.
 */
export function swipeFeedback(x: number, lockAt: number): SwipeFeedback {
  const distance = Math.abs(x);
  if (distance <= FEEDBACK_START) return { side: null, share: 0, locked: false };
  const share = Math.min((distance - FEEDBACK_START) / (lockAt - FEEDBACK_START), 1);
  return { side: x > 0 ? "pick" : "skip", share, locked: distance > lockAt };
}

/**
 * How fast (px per second, signed) a card is thrown off towards `side`
 * (-1 left, 1 right) when you let go: your finger's own speed, so a hard
 * flick keeps its pace instead of slowing as you let go, but at least
 * `min`, so a tap on Skip or an arrow key (speed 0) still sends it off
 * briskly. Only speed towards that side counts: a flick back towards the
 * middle just before letting go never makes it fly the wrong way.
 */
export function throwVelocity(release: number, side: -1 | 1, min: number): number {
  const towardsSide = release * side;
  return side * Math.max(towardsSide, min);
}
