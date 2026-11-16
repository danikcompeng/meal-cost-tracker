import { describe, expect, it } from "vitest";
import { FLICK_SPEED, REVEAL, restsOpen } from "./swipe";

describe("restsOpen", () => {
  const third = REVEAL / 3;

  it("stays open past a third of the button, snaps shut before it", () => {
    expect(restsOpen(-(third + 1), 0)).toBe(true);
    expect(restsOpen(-(third - 1), 0)).toBe(false);
    expect(restsOpen(-REVEAL, 0)).toBe(true);
    // Pulled a little past the button (the give): still just open.
    expect(restsOpen(-REVEAL - 6, 0)).toBe(true);
    expect(restsOpen(0, 0)).toBe(false);
  });

  it("closes an open row swiped back most of the way", () => {
    expect(restsOpen(-20, 0)).toBe(false);
    expect(restsOpen(-60, 0)).toBe(true);
  });

  it("follows a quick flick, wherever the row is", () => {
    expect(restsOpen(-10, -(FLICK_SPEED + 1))).toBe(true);
    expect(restsOpen(-80, FLICK_SPEED + 1)).toBe(false);
    // Not quite a flick: position decides.
    expect(restsOpen(-10, -FLICK_SPEED)).toBe(false);
  });
});
