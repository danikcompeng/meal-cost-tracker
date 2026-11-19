import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DURATION, EASE_IN, EASE_OUT, FILL_DURATION, PRESS_SCALE_WIDE, RUBBER, SCALE_FROM, SHAKE_X, SPRING } from "./motion";

// The CSS copies of the motion tokens, read from app/globals.css, so this
// fails the moment one side changes without the other.
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
function cssVar(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`--${name} isn't in globals.css`);
  return match[1].trim();
}

describe("motion tokens: CSS matches lib/motion.ts", () => {
  it("press scales", () => {
    expect(Number(cssVar("motion-press-scale"))).toBe(SCALE_FROM);
    expect(Number(cssVar("motion-press-scale-wide"))).toBe(PRESS_SCALE_WIDE);
  });

  it("press duration is DURATION.fast", () => {
    expect(cssVar("motion-fast")).toBe(`${DURATION.fast * 1000}ms`);
  });

  it("ease-out curve", () => {
    expect(cssVar("motion-ease-out")).toBe(`cubic-bezier(${EASE_OUT.join(", ")})`);
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

  it("the ring fill is the one named exception, and still under a second", () => {
    expect(FILL_DURATION).toBeGreaterThan(0.25);
    expect(FILL_DURATION).toBeLessThan(1);
  });
});

describe("motion tokens: sane values", () => {
  it("scales shrink a little, never to nothing", () => {
    for (const scale of [SCALE_FROM, PRESS_SCALE_WIDE]) {
      expect(scale).toBeGreaterThan(0.9);
      expect(scale).toBeLessThan(1);
    }
    // A wide row gives less than a button: the same visible edge movement.
    expect(PRESS_SCALE_WIDE).toBeGreaterThan(SCALE_FROM);
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
