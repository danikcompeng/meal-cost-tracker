// A finger for the demo recording: real touch events at a human pace.
//
// Playwright's own click() and tap() land instantly, which looks robotic
// on video, and a swipe needs touch moves in between. So this sends the
// browser's touch events directly (Chrome DevTools Protocol, "CDP": the
// same channel Playwright itself uses), one move every frame (16 ms),
// eased like a hand that speeds up and slows down. The app sees a real
// touch (pointerType "touch"), so Framer Motion's drag behaves exactly as
// it does on a phone.

import type { CDPSession, Locator, Page } from "@playwright/test";

type Point = { x: number; y: number };

/** One frame at 60 fps. */
const FRAME_MS = 16;

/** Slow at both ends, quick in the middle. t goes 0 → 1. */
function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export class Finger {
  private constructor(
    private readonly page: Page,
    private readonly cdp: CDPSession,
  ) {}

  static async on(page: Page): Promise<Finger> {
    return new Finger(page, await page.context().newCDPSession(page));
  }

  private async touch(type: "touchStart" | "touchMove" | "touchEnd", at?: Point) {
    await this.cdp.send("Input.dispatchTouchEvent", {
      type,
      // A fingertip, not a pin point.
      touchPoints: at ? [{ x: at.x, y: at.y, radiusX: 10, radiusY: 10, force: 1, id: 1 }] : [],
    });
  }

  /** Where to touch: the middle of the element, scrolled into view first. */
  private async centre(target: Locator): Promise<Point> {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) throw new Error(`Finger: can't see ${target}`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  /**
   * A tap that's held for a moment (like a thumb), so the app's press
   * animation shows. Waits until the element is ready to be tapped.
   */
  async tap(target: Locator, { hold = 110 } = {}) {
    // A "trial" click runs Playwright's usual checks without clicking:
    // visible, enabled, not still sliding in, nothing covering it. So the
    // finger never lands where a button was a moment ago.
    await target.click({ trial: true });
    const at = await this.centre(target);
    await this.touch("touchStart", at);
    await this.page.waitForTimeout(hold);
    await this.touch("touchEnd");
  }

  /** Puts the finger down at `from`, slides to `to` over `ms`, lifts it. */
  async swipe(from: Point, to: Point, ms: number) {
    await this.touch("touchStart", from);
    const steps = Math.max(2, Math.round(ms / FRAME_MS));
    for (let i = 1; i <= steps; i++) {
      const t = easeInOut(i / steps);
      await this.touch("touchMove", { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
      await this.page.waitForTimeout(FRAME_MS);
    }
    await this.touch("touchEnd");
  }

  /**
   * Swipes sideways across an element, starting at `start` (0 = its left
   * edge, 1 = its right edge) and moving `dx` px (negative = left).
   */
  async swipeAcross(target: Locator, dx: number, { start = 0.5, ms = 350 } = {}) {
    await target.click({ trial: true });
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) throw new Error(`Finger: can't see ${target}`);
    const from = { x: box.x + box.width * start, y: box.y + box.height / 2 };
    await this.swipe(from, { x: from.x + dx, y: from.y }, ms);
  }
}

/**
 * Scrolls the page to `y` in small eased steps, one per frame of the
 * recording (about 45 ms each), instead of the browser's own smooth
 * scroll. Between steps the page stands still, so each screenshot in
 * film.ts catches it at rest; with a continuous scroll most frames would
 * be cut from a spot the page had already left.
 */
async function glide(page: Page, y: number, ms = 600) {
  const from = await page.evaluate(() => window.scrollY);
  const steps = Math.max(1, Math.round(ms / 45));
  for (let i = 1; i <= steps; i++) {
    const top = from + (y - from) * easeInOut(i / steps);
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), top);
    await page.waitForTimeout(45);
  }
}

/** Glides until `target` is in view (centred, or at the top with "start"), then a moment to rest. */
export async function scrollTo(target: Locator, block: "center" | "start" = "center") {
  const page = target.page();
  const y = await target.evaluate((el, block) => {
    const box = el.getBoundingClientRect();
    const wanted = block === "start"
      ? window.scrollY + box.top - 16
      : window.scrollY + box.top + box.height / 2 - window.innerHeight / 2;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return Math.max(0, Math.min(wanted, max));
  }, block);
  await glide(page, y);
  await page.waitForTimeout(250);
}

/** Glides back to the top of the page. */
export async function scrollToTop(page: Page) {
  await glide(page, 0);
  await page.waitForTimeout(250);
}
