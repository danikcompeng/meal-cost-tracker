// Motion tokens: the shared timings, springs and distances for every
// animation in the app, like the colour tokens in app/globals.css.
// Use these, never a number typed into a component (plans/motion.md).
//
// Framer Motion measures time in seconds, so these are seconds too.
// CSS can't import this file, so the values CSS needs (the two press
// scales, DURATION.fast and .slow, the ease-out curve) are also written in
// globals.css as --motion-* variables; lib/motion.test.ts checks they match.
//
// The rule: anything that answers a tap lasts 150–250 ms. Springs are
// written as "visually done in this long, this bouncy" (visualDuration +
// bounce) rather than stiffness and damping, so they can be held to the
// same rule. The test checks every one.

/** How long things take, in seconds. */
export const DURATION = {
  /** Press, things fading out, the duplicate dialog. */
  fast: 0.15,
  /** Most things: messages, slides, opening and closing. */
  base: 0.2,
  /**
   * The longest allowed: the shake, a deleted row sliding off, the meal
   * pushed out by a swap, the camera picture fading in.
   */
  slow: 0.25,
} as const;

/**
 * The one exception to 150–250 ms (decision C): the progress rings
 * filling. It isn't an answer to a tap but the day's numbers being drawn,
 * and at 250 ms it's over before you've looked at it.
 */
export const FILL_DURATION = 0.8;

/**
 * The second exception (phone check 1, 2026-11-20): the Undo message
 * settling in above the tab bar. At 200 ms it popped in. It doesn't answer
 * the tap itself (the row sliding away does that); it's a message arriving
 * beside it, so it can take its time. Leaving stays DURATION.fast.
 */
export const SETTLE_DURATION = 0.4;

/** Things arriving: start fast, land softly. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
/** Things leaving: start slow, speed away. */
export const EASE_IN = [0.4, 0, 1, 1] as const;

/**
 * Where entering things start (a message, the next swap card), and how
 * far a button shrinks while pressed. Starting at 0.97 rather than 0 means
 * the thing was always there and just settles into focus.
 */
export const SCALE_FROM = 0.97;
/**
 * The press on wide rows and tiles (decision A). A row is about four times
 * wider than a button, so 0.97 would move its edges about 5 px each side;
 * 0.985 gives the same visible give as 0.97 on a button.
 */
export const PRESS_SCALE_WIDE = 0.985;

/** Springs, all visually done in 200–250 ms. */
export const SPRING = {
  /** A row snapping open or shut: quick, no bounce past the button. */
  snap: { type: "spring", visualDuration: 0.2, bounce: 0 },
  /** Back into place (the swap card, anything past a limit), with a hint of bounce. */
  settle: { type: "spring", visualDuration: 0.25, bounce: 0.15 },
  /** Sheets coming up, the next swap card arriving. */
  sheet: { type: "spring", visualDuration: 0.25, bounce: 0 },
} as const;

/** How far (px) the day and the Recipes / Foods lists slide in. */
export const SLIDE = 24;

/**
 * Past a limit, the share of your finger's movement a thing still follows:
 * 1 px for every 5 px. Framer calls it dragElastic.
 */
export const RUBBER = 0.2;

/** One shake: left-right twice, smaller the second time (px). */
export const SHAKE_X = [0, -6, 6, -4, 4, 0] as const;

/**
 * How fast (px per second) the swap card flies off when you tap Swap or
 * Skip, or press an arrow key, rather than flicking it.
 */
export const THROW_SPEED = 1500;
