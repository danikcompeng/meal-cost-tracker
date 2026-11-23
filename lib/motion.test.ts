import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DURATION,
  EASE_IN,
  EASE_OUT,
  FILL_DURATION,
  FILL_EASE,
  POP_SCALE,
  PRESS_SCALE_WIDE,
  PUSH_FADE,
  PUSH_SCALE,
  RUBBER,
  SCALE_FROM,
  SETTLE_DURATION,
  SHAKE_X,
  SPRING,
} from "./motion";

// The CSS copies of the motion tokens, read from app/globals.css, so this
// fails the moment one side changes without the other. Comments are
// stripped first, and each variable must be set exactly once: an old value
// left in a comment, or a second copy, can't be the one checked.
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
function cssVar(name: string): string {
  const matches = [...css.matchAll(new RegExp(`--${name}:\\s*([^;]+);`, "g"))];
  expect(matches, `--${name} set once in globals.css`).toHaveLength(1);
  return matches[0][1].trim();
}

describe("motion tokens: CSS matches lib/motion.ts", () => {
  it("scales: entering and pressed, and pressed wide", () => {
    expect(Number(cssVar("motion-scale-from"))).toBe(SCALE_FROM);
    expect(Number(cssVar("motion-press-scale-wide"))).toBe(PRESS_SCALE_WIDE);
  });

  it("press duration is DURATION.fast", () => {
    expect(cssVar("motion-fast")).toBe(`${DURATION.fast * 1000}ms`);
  });

  it("a closing sheet's dim layer fades over DURATION.base", () => {
    expect(cssVar("motion-base")).toBe(`${DURATION.base * 1000}ms`);
  });

  it("the camera picture's fade is DURATION.slow", () => {
    expect(cssVar("motion-slow")).toBe(`${DURATION.slow * 1000}ms`);
  });

  it("ease-out curve", () => {
    expect(cssVar("motion-ease-out")).toBe(`cubic-bezier(${EASE_OUT.join(", ")})`);
  });

  it("the press rules read the variables, not typed-in numbers", () => {
    expect(css).toContain("scale: var(--motion-scale-from);");
    expect(css).toContain("scale: var(--motion-press-scale-wide);");
    expect(css).toContain("transition-duration: var(--motion-fast);");
  });
});

describe("motion tokens: short (150–250 ms)", () => {
  it.each(Object.entries(DURATION))("DURATION.%s", (_name, seconds) => {
    expect(seconds).toBeGreaterThanOrEqual(0.15);
    expect(seconds).toBeLessThanOrEqual(0.25);
  });

  it.each(Object.entries(SPRING))("SPRING.%s is visually done in time, bouncing at most a little", (_name, spring) => {
    expect(spring.visualDuration).toBeGreaterThanOrEqual(0.15);
    expect(spring.visualDuration).toBeLessThanOrEqual(0.25);
    expect(spring.bounce).toBeGreaterThanOrEqual(0);
    expect(spring.bounce).toBeLessThanOrEqual(0.2);
  });

  it("the ring fill is a named exception, 1.3–1.5 s: long enough to watch it sweep", () => {
    expect(FILL_DURATION).toBeGreaterThanOrEqual(1.3);
    expect(FILL_DURATION).toBeLessThanOrEqual(1.5);
  });

  it("the ring curve is a soft ease-out: a start you can follow, a flat landing", () => {
    const [x1, y1, x2, y2] = FILL_EASE;
    // How steep it starts (y1 / x1): easeOutCubic is 3, easeOutQuart 4.
    // Expo-out (6.25) started so fast the ring seemed to jump.
    expect(y1 / x1).toBeGreaterThanOrEqual(3);
    expect(y1 / x1).toBeLessThanOrEqual(4);
    // Lands flat (y2 = 1), slowing down as it reaches the number.
    expect(y2).toBe(1);
    expect(x2).toBeGreaterThan(0);
  });

  it("the Undo message settling in is the other, slower than a tap but quicker than the rings", () => {
    expect(SETTLE_DURATION).toBeGreaterThan(DURATION.slow);
    expect(SETTLE_DURATION).toBeLessThan(FILL_DURATION);
  });
});

describe("motion tokens: sane values", () => {
  it("the swap carousel shrinks and fades a little, never away", () => {
    expect(PUSH_SCALE).toBeGreaterThanOrEqual(0.85);
    expect(PUSH_SCALE).toBeLessThan(1);
    expect(PUSH_FADE).toBeGreaterThan(0.3);
    expect(PUSH_FADE).toBeLessThan(1);
  });

  it("scales shrink a little, never to nothing", () => {
    for (const scale of [SCALE_FROM, PRESS_SCALE_WIDE]) {
      expect(scale).toBeGreaterThan(0.9);
      expect(scale).toBeLessThan(1);
    }
    // A wide row gives less than a button: the same visible edge movement.
    expect(PRESS_SCALE_WIDE).toBeGreaterThan(SCALE_FROM);
  });

  it("the swipe sign's pop is tiny: a click, not a bounce", () => {
    expect(POP_SCALE).toBeGreaterThan(1);
    expect(POP_SCALE).toBeLessThanOrEqual(1.1);
  });

  it("the rubber band resists: less than half the finger's movement", () => {
    expect(RUBBER).toBeGreaterThan(0);
    expect(RUBBER).toBeLessThan(0.5);
  });

  it("the shake starts and ends in place, and calms down", () => {
    expect(SHAKE_X[0]).toBe(0);
    expect(SHAKE_X[SHAKE_X.length - 1]).toBe(0);
    const swings = SHAKE_X.slice(1, -1).map(Math.abs);
    expect(swings[swings.length - 1]).toBeLessThan(swings[0]);
  });

  it("curves are valid cubic-béziers (x between 0 and 1)", () => {
    for (const [x1, , x2] of [EASE_OUT, EASE_IN]) {
      for (const x of [x1, x2]) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
      }
    }
  });
});
