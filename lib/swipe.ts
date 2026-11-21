// Swipe to reveal on a Today row (like iPhone Mail): where the row rests
// after you let go. And how fast a skipped swap card is thrown off. Pure,
// so they can be unit tested.

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
