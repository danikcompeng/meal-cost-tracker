// Records the silent portfolio demo of Staple: `npm run record:demo`.
//
// Two takes, light mode and dark mode, on an iPhone-sized screen, logged
// in ONLY through "Try the demo" (no personal data). Each take resets the
// demo first, off camera, so it always starts from the same sample day.
//
// Makes, in design/videos/:
//   staple-demo-light.mp4, staple-demo-dark.mp4  the whole tour (~75 s)
//   staple-loop-light.mp4, staple-loop-dark.mp4  shots 1 + 4 (~20 s), a
//                                                loop for the top of a page
// (.webm instead, and no loop, when ffmpeg isn't installed: see film.ts.)
//
// The shot list:
//   1. Login → Try the demo → Today: the rings fill.
//   2. Show details under the rings, then hide them.
//   3. Add a meal: a recipe at 1.5 servings, logged to dinner.
//   4. "I'm tired of this" on lunch: skip a card, swap to the next (the
//      carousel slide on Today), then Undo.
//   5. Swipe a row to show the trash can, delete it, Undo.
//   6. Kitchen → a recipe: cost per serving and nutrients.
//   7. Scan: the camera sees a tray of chicken thighs slide into the scan
//      window and the app's real scanner reads its barcode (a made-up
//      camera picture with a real product's barcode,
//      helpers/barcode-clip.ts) → Open Food
//      Facts → Save and log → back on Today. Without ffmpeg there's no
//      such picture, so it taps "Type the number" instead.

import fs from "node:fs";
import path from "node:path";
import { chromium, expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { barcodeClip } from "./helpers/barcode-clip";
import { expectToday, literal, loginWithDemo, resetDemo, topCard } from "./helpers/demo";
import { fakeCamera } from "./helpers/fake-camera";
import { Film, findFfmpeg } from "./helpers/film";
import { Finger, scrollTo, scrollToTop } from "./helpers/finger";
import { BASE_URL, PHONE } from "./helpers/phone";

const VIDEOS = path.resolve("design", "videos");
/** Over this, a video is too big to commit: the script warns, so leave it out of git. */
const MAX_BYTES = 10 * 1024 * 1024;
/** Video pixels: the phone's 393 x 852 screen at 2x. */
const SIZE = { width: PHONE.viewport.width * 2, height: PHONE.viewport.height * 2 };
/** The page background (CLAUDE.md), for the fade in and out. */
const BACKGROUND = { light: "white", dark: "0x141414" } as const;
/**
 * Chicken thighs, 1 kg, a real product on Open Food Facts (category
 * "chicken thighs"), with all eight nutrients per 100 g: 186 kcal, 18.5 g
 * protein, 0 g carbs, 12.5 g fat. Checked against the API on 2026-11-23;
 * the check digit is checked again when the barcode is drawn.
 */
const BARCODE = "5054268934725";
/** What the 1 kg tray cost (a Toronto price), typed into "What you paid". */
const PRICE = "10.99";
/**
 * Where the scan window sits on the camera picture, as a fraction of its
 * width and height: the middle across, a little above the middle down (the
 * hint and buttons below push it up). The barcode comes to rest there.
 */
const SCAN_WINDOW = { x: 0.5, y: 0.45 };

type Theme = keyof typeof BACKGROUND;

test.describe.configure({ mode: "serial" });

/**
 * The calorie target for the takes. The sample day's 2,200 would end the
 * tour over target once the chicken is logged (2,237 kcal by then), so the
 * takes use 2,300 and Today ends 63 kcal under. Set off camera; the reset
 * after recording puts the shared demo back to 2,200.
 */
const KCAL_TARGET = "2300";

/**
 * Off camera: the sample data, fresh, so every take is the same. With
 * `target`, also sets the daily calorie target in Settings.
 */
async function freshDemo(browser: Browser, target?: string) {
  const context = await browser.newContext({ ...PHONE, baseURL: BASE_URL });
  try {
    const page = await context.newPage();
    await loginWithDemo(page);
    await resetDemo(page);
    if (target) {
      await page.goto("/settings");
      await page.getByRole("textbox", { name: "Calories" }).fill(target);
      await page.getByRole("button", { name: "Save targets" }).click();
      await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    }
  } finally {
    await context.close();
  }
}

/** Taps into a box, deletes what's there (as a thumb would), types. */
async function retype(page: Page, finger: Finger, box: Locator, text: string) {
  await finger.tap(box);
  await box.press("End");
  const old = await box.inputValue();
  for (let i = 0; i < old.length; i++) await page.keyboard.press("Backspace", { delay: 90 });
  await page.keyboard.type(text, { delay: 170 });
}

/**
 * Everything on camera. `film` gets marks where the loop is cut.
 * `realScan`: the browser's camera shows the barcode clip, so shot 7 scans
 * it; otherwise it types the number.
 */
async function act(page: Page, film: Pick<Film, "mark">, realScan: boolean) {
  const finger = await Finger.on(page);
  const pause = (ms: number) => page.waitForTimeout(ms);
  const tabs = page.getByRole("navigation", { name: "Main" });

  // 1. Login → Try the demo → Today: the rings fill.
  film.mark("shot1");
  await pause(1600);
  await finger.tap(page.getByRole("button", { name: "Try the demo" }));
  await expectToday(page);
  // The rings take 1.4 s to fill (FILL_DURATION), then time to read.
  await pause(3400);
  film.mark("shot1-end");

  // 2. Show details, then hide them.
  const summary = page.getByRole("region", { name: "Calories today" });
  await finger.tap(summary.getByRole("button", { name: "Show details" }));
  await pause(500);
  await scrollTo(summary.getByText(/^Today costs/));
  await pause(2600);
  await finger.tap(summary.getByRole("button", { name: "Hide details" }));
  await pause(1000);

  // 3. Add a meal: Tuna rice, 1.5 servings, to dinner.
  const dinner = page.getByRole("region", { name: "Dinner" });
  await scrollTo(dinner);
  await pause(400);
  await finger.tap(dinner.getByRole("button", { name: "Add to dinner" }));
  const addSheet = page.getByRole("dialog", { name: "Add to dinner" });
  await expect(addSheet).toBeVisible();
  await pause(1400);
  await finger.tap(addSheet.getByRole("button", { name: /^Tuna rice/ }));
  const servings = addSheet.getByRole("textbox", { name: "Servings" });
  await expect(servings).toBeVisible();
  await pause(900);
  await retype(page, finger, servings, "1.5");
  await pause(1600);
  await finger.tap(addSheet.getByRole("button", { name: "Log it" }));
  await expect(addSheet).toBeHidden();
  await expect(dinner.getByRole("button", { name: /^Tuna rice 1\.5 servings/ })).toBeVisible();
  await pause(2000);

  // 4. "I'm tired of this" on lunch: skip one card, swap to the next.
  const lunch = page.getByRole("region", { name: "Lunch" });
  await scrollTo(lunch);
  await pause(300);
  film.mark("shot4");
  await pause(600);
  await finger.tap(lunch.getByRole("button", { name: "Tired of Chicken rice bowl? Swap it" }));
  const swapSheet = page.getByRole("dialog", { name: "Instead of Chicken rice bowl" });
  await expect(swapSheet.getByText("1 of 4", { exact: true })).toBeVisible();
  await pause(2600);
  // Swipe left: skip. Starts right of centre so the finger stays on screen.
  const skipped = await topCard(swapSheet);
  await finger.swipeAcross(swapSheet.getByRole("article", { name: skipped }), -200, { start: 0.7, ms: 300 });
  await expect(swapSheet.getByText("2 of 4", { exact: true })).toBeVisible();
  await pause(2600);
  // Swipe right: swap. The sheet closes and lunch slides over.
  const picked = await topCard(swapSheet);
  await finger.swipeAcross(swapSheet.getByRole("article", { name: picked }), 200, { start: 0.3, ms: 300 });
  await expect(swapSheet).toBeHidden();
  await expect(lunch.getByRole("button", { name: new RegExp(`^${literal(picked)} 1 serving`) })).toBeVisible();
  await pause(2400);
  await finger.tap(page.getByRole("button", { name: "Undo" }));
  await expect(lunch.getByRole("button", { name: /^Chicken rice bowl 1 serving/ })).toBeVisible();
  await pause(1800);
  film.mark("shot4-end");

  // 5. Swipe the banana to show the trash can, delete it, Undo.
  const snack = page.getByRole("region", { name: "Snack" });
  await scrollTo(snack);
  await pause(700);
  const banana = snack.locator("[data-entry-row]").filter({ hasText: "Banana" });
  await finger.swipeAcross(banana, -130, { start: 0.8, ms: 450 });
  await pause(1300);
  await finger.tap(page.getByRole("button", { name: "Delete Banana" }));
  await expect(snack.getByRole("button", { name: /^Banana/ })).toHaveCount(0);
  await pause(1800);
  await finger.tap(page.getByRole("button", { name: "Undo" }));
  await expect(snack.getByRole("button", { name: /^Banana 1 item/ })).toBeVisible();
  await pause(1800);

  // 6. Kitchen → Chicken rice bowl: cost per serving, then the nutrients.
  await finger.tap(tabs.getByRole("link", { name: "Kitchen" }));
  await expect(page.getByRole("heading", { name: "Recipes", level: 1 })).toBeVisible();
  await pause(1700);
  await finger.tap(page.getByRole("link", { name: /^Chicken rice bowl/ }));
  await expect(page.getByRole("heading", { name: "Chicken rice bowl", level: 1 })).toBeVisible();
  await pause(2600);
  await scrollTo(page.getByRole("region", { name: "Per serving", exact: true }), "start");
  await pause(2800);

  // 7. Scan the tray (or type its number) → Save and log → Today.
  await finger.tap(tabs.getByRole("link", { name: "Scan" }));
  if (!realScan) {
    const typeNumber = page.getByRole("button", { name: "Type the number" });
    await expect(typeNumber).toBeVisible();
    await pause(1500);
    await finger.tap(typeNumber);
    const barcode = page.getByRole("textbox", { name: "Barcode" });
    await expect(barcode).toBeVisible();
    await pause(700);
    await finger.tap(barcode);
    await page.keyboard.type(BARCODE, { delay: 110 });
    await pause(600);
    await finger.tap(page.getByRole("button", { name: "Look it up" }));
  }
  // Scanning: the tray slides into the window and the app reads it by
  // itself, then looks it up. Open Food Facts can be slow.
  await expect(page.getByRole("heading", { name: "Check the numbers" })).toBeVisible({ timeout: 30_000 });
  await pause(2400);
  const price = page.getByRole("textbox", { name: "Price" });
  await scrollTo(price);
  await pause(400);
  await finger.tap(price);
  await page.keyboard.type(PRICE, { delay: 170 });
  await pause(900);
  await finger.tap(page.getByRole("button", { name: "Save and log" }));
  await page.waitForURL((url) => url.pathname === "/");
  const logSheet = page.getByRole("dialog");
  const amount = logSheet.getByRole("textbox", { name: "Amount" });
  await expect(amount).toBeVisible();
  await pause(1200);
  await finger.tap(amount);
  await page.keyboard.type("100", { delay: 170 });
  await pause(1300);
  await finger.tap(logSheet.getByRole("button", { name: "Log it" }));
  await expect(logSheet).toBeHidden();
  await pause(1500);
  await scrollToTop(page);
  await pause(2600);
}

/** Size in MB, one decimal, for the report. */
function megabytes(file: string) {
  return (fs.statSync(file).size / 1024 / 1024).toFixed(1);
}

for (const theme of ["light", "dark"] as const satisfies readonly Theme[]) {
  test(`${theme} take`, async ({ browser }) => {
    await freshDemo(browser, KCAL_TARGET);
    const ffmpeg = await findFfmpeg();
    const webm = path.join(VIDEOS, `staple-demo-${theme}.webm`);

    // With ffmpeg: a browser of our own whose camera is the barcode clip
    // (Chromium's fake camera plays the file; the app can't tell). The
    // camera is chosen when the browser starts, hence a separate one.
    const clip = ffmpeg
      ? await barcodeClip(browser, ffmpeg, BARCODE, path.resolve("test-results", "recording"), SCAN_WINDOW)
      : null;
    const camera = clip
      ? await chromium.launch({
          args: [
            "--use-fake-device-for-media-stream",
            "--use-fake-ui-for-media-stream",
            `--use-file-for-fake-video-capture=${clip}`,
          ],
        })
      : null;
    const context = await (camera ?? browser).newContext({
      ...PHONE,
      baseURL: BASE_URL,
      colorScheme: theme,
      reducedMotion: "no-preference",
      permissions: ["camera"],
      // Without ffmpeg, Playwright's own (softer) .webm is the result.
      recordVideo: ffmpeg ? undefined : { dir: path.resolve("test-results", "recording"), size: SIZE },
    });
    // No clip: a calm stand-in picture behind "Type the number".
    if (!clip) await context.addInitScript(fakeCamera);
    const page = await context.newPage();
    await page.goto("/login");
    // Wait until the login page has fully settled (fonts, the email form)
    // before the camera rolls.
    await expect(page.getByRole("button", { name: "Email me a login code" })).toBeVisible();
    await page.waitForLoadState("networkidle");

    const film = ffmpeg ? await Film.roll(page, path.resolve("test-results", "recording", theme)) : null;
    try {
      // No film (the .webm fallback): the cut marks aren't needed.
      await act(page, film ?? { mark() {} }, clip !== null);
    } finally {
      await film?.stop();
      await context.close();
      await camera?.close();
    }

    const made: string[] = [];
    if (film && ffmpeg) {
      const full = path.join(VIDEOS, `staple-demo-${theme}.mp4`);
      film.encode(ffmpeg, full, [{ from: film.at("shot1"), to: film.at("end") }], { fade: BACKGROUND[theme] });
      const loop = path.join(VIDEOS, `staple-loop-${theme}.mp4`);
      film.encode(
        ffmpeg,
        loop,
        [
          // Less of the still login screen, to keep the loop under 20 s.
          { from: film.at("shot1") + 700, to: film.at("shot1-end") },
          { from: film.at("shot4"), to: film.at("shot4-end") },
        ],
        { fade: BACKGROUND[theme] },
      );
      made.push(full, loop);
    } else {
      console.log("No ffmpeg found, so the video stays .webm and there's no loop (see e2e/helpers/film.ts).");
      fs.mkdirSync(VIDEOS, { recursive: true });
      await page.video()!.saveAs(webm);
      made.push(webm);
    }
    for (const file of made) {
      const tooBig = fs.statSync(file).size > MAX_BYTES ? "  (over 10 MB: don't commit)" : "";
      console.log(`${path.relative(process.cwd(), file)}: ${megabytes(file)} MB${tooBig}`);
    }
  });
}

// Leave the demo clean for whoever taps "Try the demo" next.
test.afterAll(async ({ browser }) => {
  await freshDemo(browser);
});
