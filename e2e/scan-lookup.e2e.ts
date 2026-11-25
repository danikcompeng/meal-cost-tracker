// The scanner's "Looking up…" panel: its two grey placeholder lines must
// show, on the camera's panel and on the typed screen's tile, in light and
// dark. (They once used the tile's own grey, so on the typed screen they
// were invisible.)
//
// No real camera or barcode: before the page loads, the camera is either
// a plain green picture with a stand-in BarcodeDetector that "reads" a
// barcode straight away, or missing (so the scanner offers "Type the
// number"). The lookup request is never answered, so "Looking up…" stays.

import { expect, test, type Page } from "@playwright/test";
import { loginWithDemo } from "./helpers/demo";

/** A real EAN-13 (valid check digit), so the app accepts it. */
const BARCODE = "4006381333931";

function fakeCameraThatReads(barcode: string) {
  class StandInDetector {
    static async getSupportedFormats() {
      return ["ean_13", "ean_8", "upc_a", "upc_e"];
    }
    async detect() {
      return [{ rawValue: barcode, format: "ean_13" }];
    }
  }
  (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector = StandInDetector;
  navigator.mediaDevices.getUserMedia = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const paint = () => {
      const g = canvas.getContext("2d")!;
      g.fillStyle = "#88aa66";
      g.fillRect(0, 0, 640, 480);
      requestAnimationFrame(paint);
    };
    paint();
    return canvas.captureStream(30);
  };
}

function noCamera() {
  navigator.mediaDevices.getUserMedia = async () => {
    throw new DOMException("No camera", "NotFoundError");
  };
}

/** The lookup is a server action, a POST to /scan: never answer it. */
async function holdLookup(page: Page) {
  await page.route("**/scan**", (route) => (route.request().method() === "POST" ? undefined : route.continue()));
}

/**
 * The colour of each placeholder line, and of the nearest box behind it
 * that has a colour of its own (the panel or the tile).
 */
async function linesAndBehind(page: Page) {
  const status = page.getByRole("status").filter({ has: page.getByRole("heading", { name: "Looking up…" }) });
  await expect(status).toBeVisible();
  return status.evaluate((el) => {
    const bars = [...el.querySelectorAll('[aria-hidden="true"] > div')];
    const colour = (e: Element) => getComputedStyle(e).backgroundColor;
    const clear = (c: string) => c === "rgba(0, 0, 0, 0)" || c === "transparent";
    let behind: Element | null = el.parentElement;
    while (behind && clear(colour(behind))) behind = behind.parentElement;
    return { lines: bars.map(colour), behind: behind ? colour(behind) : null };
  });
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`${theme} mode`, () => {
    test.use({ colorScheme: theme });

    test("Looking up… placeholder lines show over the camera", async ({ page }) => {
      await loginWithDemo(page);
      await page.addInitScript(fakeCameraThatReads, BARCODE);
      await holdLookup(page);
      await page.goto("/scan");
      await expect(page.getByRole("heading", { name: "Looking up…" })).toBeVisible({ timeout: 20_000 });

      const { lines, behind } = await linesAndBehind(page);
      expect(lines).toHaveLength(2);
      expect(behind).not.toBeNull();
      for (const line of lines) expect(line).not.toBe(behind);
    });

    test("Looking up… placeholder lines show on the typed screen", async ({ page }) => {
      await loginWithDemo(page);
      await page.addInitScript(noCamera);
      await holdLookup(page);
      await page.goto("/scan");
      await page.getByRole("button", { name: "Type the number" }).click();
      await page.getByRole("textbox", { name: "Barcode" }).fill(BARCODE);
      await page.getByRole("button", { name: "Look it up" }).click();

      const { lines, behind } = await linesAndBehind(page);
      expect(lines).toHaveLength(2);
      expect(behind).not.toBeNull();
      for (const line of lines) expect(line).not.toBe(behind);
    });
  });
}
