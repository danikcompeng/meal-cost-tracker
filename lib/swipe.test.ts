import { describe, expect, it } from "vitest";
import {
  COMMIT_DISTANCE,
  COMMIT_SPEED,
  FEEDBACK_START,
  FLICK_SPEED,
  LOCK_AT,
  REVEAL,
  SIDEWAYS_GIVE,
  releaseSide,
  restsOpen,
  swipeFeedback,
  throwVelocity,
} from "./swipe";

describe("releaseSide", () => {
  it("locks where the finger has gone COMMIT_DISTANCE from rest", () => {
    expect(LOCK_AT).toBeCloseTo(COMMIT_DISTANCE * SIDEWAYS_GIVE);
  });

  it("counts past the lock, either way", () => {
    expect(releaseSide(LOCK_AT + 1, 0)).toBe("pick");
    expect(releaseSide(-(LOCK_AT + 1), 0)).toBe("skip");
  });

  it("springs back short of it", () => {
    expect(releaseSide(LOCK_AT - 1, 0)).toBeNull();
    expect(releaseSide(-(LOCK_AT - 1), 0)).toBeNull();
    expect(releaseSide(0, 0)).toBeNull();
  });

  it("agrees with the sign: full strength and locked exactly when it counts", () => {
    for (const x of [-200, -LOCK_AT - 0.1, -LOCK_AT, -50, 0, 50, LOCK_AT, LOCK_AT + 0.1, 200]) {
      expect(releaseSide(x, 0) !== null).toBe(swipeFeedback(x, LOCK_AT).locked);
    }
  });

  it("a fast flick counts towards the side the card is on", () => {
    expect(releaseSide(20, COMMIT_SPEED + 1)).toBe("pick");
    expect(releaseSide(-20, -(COMMIT_SPEED + 1))).toBe("skip");
  });

  it("a flick back towards the middle means never mind", () => {
    expect(releaseSide(60, -(COMMIT_SPEED + 1))).toBeNull();
    expect(releaseSide(-60, COMMIT_SPEED + 1)).toBeNull();
  });
});

describe("swipeFeedback", () => {
  const lockAt = LOCK_AT;

  it("shows nothing in the middle or for a tap's wobble", () => {
    expect(swipeFeedback(0, lockAt)).toEqual({ side: null, share: 0, locked: false });
    expect(swipeFeedback(FEEDBACK_START, lockAt)).toEqual({ side: null, share: 0, locked: false });
    expect(swipeFeedback(-FEEDBACK_START, lockAt)).toEqual({ side: null, share: 0, locked: false });
  });

  it("right is pick, left is skip, growing with the distance", () => {
    const half = FEEDBACK_START + (lockAt - FEEDBACK_START) / 2;
    expect(swipeFeedback(half, lockAt)).toEqual({ side: "pick", share: 0.5, locked: false });
    expect(swipeFeedback(-half, lockAt)).toEqual({ side: "skip", share: 0.5, locked: false });
  });

  it("is full strength at the lock and locks just past it", () => {
    expect(swipeFeedback(lockAt, lockAt)).toEqual({ side: "pick", share: 1, locked: false });
    expect(swipeFeedback(lockAt + 0.1, lockAt)).toEqual({ side: "pick", share: 1, locked: true });
    expect(swipeFeedback(-(lockAt + 0.1), lockAt).locked).toBe(true);
  });

  it("never goes past full strength (a card thrown off keeps its sign)", () => {
    expect(swipeFeedback(-900, lockAt)).toEqual({ side: "skip", share: 1, locked: true });
  });
});

describe("throwVelocity", () => {
  it("keeps a hard flick's own speed", () => {
    expect(throwVelocity(-3000, -1, 1500)).toBe(-3000);
    expect(throwVelocity(2400, 1, 1500)).toBe(2400);
  });

  it("is at least the minimum: a tap or an arrow key has no speed", () => {
    expect(throwVelocity(0, -1, 1500)).toBe(-1500);
    expect(throwVelocity(-200, -1, 1500)).toBe(-1500);
  });

  it("never flies the wrong way after a flick back towards the middle", () => {
    expect(throwVelocity(900, -1, 1500)).toBe(-1500);
    expect(throwVelocity(-900, 1, 1500)).toBe(1500);
  });
});

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
