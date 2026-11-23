// The camera picture for the demo's real scan: a plain tray of raw chicken
// thighs under clear wrap, on a plain counter, with one white sticker that
// says "Chicken thighs" and carries a real product's EAN-13 barcode. The
// camera holds still; the tray slides into the scan window once, smoothly,
// and stays there.
//
// How it reaches the app: Chromium can pretend a video file is its camera
// (--use-fake-device-for-media-stream with
// --use-file-for-fake-video-capture=<file>, see record-demo.ts). The app's
// own scanner then reads the barcode off that "camera" exactly as on a
// phone, and looks it up on Open Food Facts. No app code knows about this.
//
// Made in two steps, both on this computer:
// 1. The still scene is drawn as a web page (plain HTML and CSS, the
//    barcode as SVG bars) and saved as a PNG by the browser.
// 2. ffmpeg moves a camera-sized window over that picture and writes a
//    .y4m file, the raw video format Chromium's fake camera reads. It's big
//    (about 90 MB), so it lives in test-results/, never in git.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { Browser } from "@playwright/test";

/**
 * The camera's picture. Square, because that's what the app gets anyway:
 * it asks for 1280 x 720, and Chromium's fake camera, which can only crop
 * and shrink a file, hands over the middle 720 x 720 of anything 720 tall.
 * The phone screen (object-cover) then shows the middle strip of it, about
 * 330 px wide. 15 frames a second, for 8 s, then it loops (long after the
 * barcode has been read).
 */
const CAMERA = { width: 720, height: 720, fps: 15, seconds: 8 };
/**
 * What the camera sees of the scene, before it's scaled down to CAMERA.
 * Sized so the barcode's bars span about three quarters of the scan window
 * (the window is about 265 x 165 camera pixels), about 2 camera pixels per
 * bar width: sharp enough for the reader, small enough to look real.
 */
const VIEW = { width: 1700, height: 1700 };
/** The scene is taller than what the camera sees, so the tray can slide in. */
const SCENE = { width: 2000, height: 3300 };
/**
 * Where the tray starts, in scene pixels below where it stops: low enough
 * that the barcode is outside the scan window, so the clip opens on the
 * counter and the near edge of the tray.
 */
const SLIDE = 800;
/** The slide: still until START, then glides into place over DURATION (seconds). */
const START = 1.0;
const DURATION = 1.8;

// EAN-13: each digit is 7 thin columns ("modules"), 1 = bar, 0 = space.
// The left six digits use pattern L or G, chosen by the first digit; the
// right six use R. That choice is how the first digit is encoded, since
// it has no bars of its own.
const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = L.map((code) => [...code].reverse().map((bit) => (bit === "1" ? "0" : "1")).join(""));
const R = L.map((code) => [...code].map((bit) => (bit === "1" ? "0" : "1")).join(""));
const LEFT_PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

/** The 95 modules of an EAN-13 barcode, as a string of 1s (bars) and 0s. */
export function ean13Modules(code: string): string {
  if (!/^\d{13}$/.test(code)) throw new Error(`Not an EAN-13 number: ${code}`);
  const digits = [...code].map(Number);
  const check = (10 - (digits.slice(0, 12).reduce((sum, d, i) => sum + d * (i % 2 ? 3 : 1), 0) % 10)) % 10;
  if (check !== digits[12]) throw new Error(`${code} has the wrong check digit (should end in ${check})`);
  const parity = LEFT_PARITY[digits[0]];
  const left = digits.slice(1, 7).map((d, i) => (parity[i] === "L" ? L : G)[d]).join("");
  const right = digits.slice(7).map((d) => R[d]).join("");
  return `101${left}01010${right}101`;
}

/** The barcode as SVG: bars, then the number under them in the usual groups. */
function barcodeSvg(code: string, module: number) {
  const modules = ean13Modules(code);
  const quiet = 11; // white space either side, so the reader finds the edges
  const width = (95 + quiet * 2) * module;
  const barHeight = 60 * module;
  // Guard bars (start, middle, end) run a little longer, as printed.
  const guard = (i: number) => i < 3 || (i >= 45 && i < 50) || i >= 92;
  const bars = [...modules]
    .map((bit, i) =>
      bit === "1"
        ? `<rect x="${(quiet + i) * module}" y="0" width="${module}" height="${guard(i) ? barHeight + 5 * module : barHeight}"/>`
        : "",
    )
    .join("");
  const text = (x: number, s: string) =>
    `<text x="${x * module}" y="${barHeight + 9 * module}" font-size="${9 * module}" text-anchor="middle">${s}</text>`;
  return `<svg id="barcode" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${barHeight + 11 * module}"
      style="display:block; font-family: Arial, sans-serif; fill: #111">
    ${bars}
    ${text(quiet - 4, code[0])}
    ${text(quiet + 3 + 21, code.slice(1, 7))}
    ${text(quiet + 50 + 21, code.slice(7))}
  </svg>`;
}

/** One raw chicken thigh: an irregular pale-pink shape, a little lighter at its fatty edge. */
function thigh(left: number, top: number, w: number, h: number, turn: number, radius: string) {
  return `<div style="position:absolute; left:${left}px; top:${top}px; width:${w}px; height:${h}px;
      transform: rotate(${turn}deg); border-radius:${radius};
      background:
        radial-gradient(60% 55% at 45% 45%, #e39a92, #d98c86 55%, transparent 75%),
        radial-gradient(90% 85% at 50% 50%, #e7a9a0 40%, #efc9bb 78%, #f3dccf);
      box-shadow: inset 0 -14px 30px rgba(120,40,40,.18), 0 6px 10px rgba(0,0,0,.25)"></div>`;
}

/**
 * The still scene. Plain on purpose: a neutral counter, a black tray, four
 * thighs, clear wrap, and one white sticker with only "Chicken thighs" and
 * the barcode. No brand, logo or decoration.
 */
function sceneHtml(code: string) {
  return `<!doctype html><html><body style="margin:0">
  <div style="position:relative; width:${SCENE.width}px; height:${SCENE.height}px; overflow:hidden;
      background: radial-gradient(140% 90% at 50% 40%, #d6d3ce, #c9c6c1);">
    <!-- The tray, centred. -->
    <div style="position:absolute; left:50%; top:50%; width:1250px; height:900px; transform:translate(-50%, -50%);">
      <div style="position:absolute; inset:24px -16px -28px -16px; border-radius:70px; background:rgba(0,0,0,.35); filter:blur(30px)"></div>
      <div style="position:absolute; inset:0; border-radius:60px; background:#26262a;
          box-shadow: inset 0 0 0 26px #303035, inset 0 0 0 30px #1c1c1f"></div>
      <!-- The thighs. -->
      ${thigh(70, 80, 560, 380, -8, "48% 52% 45% 55% / 55% 48% 52% 45%")}
      ${thigh(610, 70, 570, 390, 6, "52% 48% 55% 45% / 50% 55% 45% 50%")}
      ${thigh(80, 440, 570, 390, 5, "55% 45% 50% 50% / 45% 52% 48% 55%")}
      ${thigh(620, 430, 560, 400, -6, "46% 54% 52% 48% / 52% 46% 54% 48%")}
      <!-- Clear wrap: a faint sheen and two soft glints. -->
      <div style="position:absolute; inset:18px; border-radius:46px;
          background: linear-gradient(115deg, rgba(255,255,255,.10), rgba(255,255,255,.02) 40%, rgba(255,255,255,.12) 62%, rgba(255,255,255,.03));"></div>
      <div style="position:absolute; left:120px; top:60px; width:420px; height:30px; border-radius:30px;
          background:rgba(255,255,255,.35); filter:blur(10px); transform:rotate(-12deg)"></div>
      <div style="position:absolute; right:110px; bottom:90px; width:300px; height:24px; border-radius:24px;
          background:rgba(255,255,255,.28); filter:blur(9px); transform:rotate(-12deg)"></div>
      <!-- The sticker, on top of the wrap, in the middle of the tray. -->
      <div style="position:absolute; left:50%; top:50%; transform:translate(-50%, -50%);
          background:#fbfbf9; border-radius:8px; padding:30px 34px 24px; box-shadow: 0 2px 6px rgba(0,0,0,.25);
          font-family: Arial, sans-serif; color:#111;">
        <div style="font-size:54px; font-weight:bold; margin:0 0 22px 12px">Chicken thighs</div>
        ${barcodeSvg(code, 5)}
      </div>
    </div>
  </div></body></html>`;
}

/** Draws the scene; returns where the barcode's middle is in it. */
async function drawScene(browser: Browser, code: string, png: string) {
  const page = await browser.newPage({ viewport: SCENE, deviceScaleFactor: 1 });
  try {
    await page.setContent(sceneHtml(code));
    await page.screenshot({ path: png });
    const box = (await page.locator("#barcode").boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  } finally {
    await page.close();
  }
}

/**
 * Makes the fake camera's video for `code` and returns its path. `aim` is
 * where on the camera picture the scan window is, as a fraction of its
 * width and height (0.5, 0.5 = the middle).
 */
export async function barcodeClip(
  browser: Browser,
  ffmpeg: string,
  code: string,
  dir: string,
  aim: { x: number; y: number },
): Promise<string> {
  fs.mkdirSync(dir, { recursive: true });
  const png = path.join(dir, `barcode-scene-${code}.png`);
  const clip = path.join(dir, `barcode-camera-${code}.y4m`);
  const barcode = await drawScene(browser, code, png);

  // The window's top-left corner once the barcode sits under the scan
  // window. Before the slide the window is SLIDE higher up the scene, so
  // the tray shows lower down; it then moves straight down to rest. No
  // sideways movement, no turning, nothing after it stops.
  const restX = Math.round(barcode.x - aim.x * VIEW.width);
  const restY = Math.round(barcode.y - aim.y * VIEW.height);
  if (restX < 0 || restX > SCENE.width - VIEW.width || restY - SLIDE < 0 || restY > SCENE.height - VIEW.height) {
    throw new Error(`The camera would move off the scene (rest ${restX}, ${restY}): enlarge SCENE`);
  }
  // ffmpeg expression, `t` in seconds. `p` runs 0 → 1 during the slide;
  // 3p² - 2p³ (smoothstep) starts and ends gently. Commas are written \,
  // because a bare comma would end the filter (ffmpeg's filtergraph
  // escaping). The reader reads one line across the bars, so it picks the
  // code up as the bars cross the window, near the end of the slide.
  const p = `clip((t-${START})/${DURATION}\\,0\\,1)`;
  const y = `${restY - SLIDE}+${SLIDE}*(3*${p}*${p}-2*${p}*${p}*${p})`;
  const filters = [
    `crop=w=${VIEW.width}:h=${VIEW.height}:x=${restX}:y=${y}`,
    `scale=${CAMERA.width}:${CAMERA.height}`,
    // A phone camera's slight softness.
    "gblur=sigma=0.5",
    "format=yuv420p",
  ].join(",");
  const run = spawnSync(
    ffmpeg,
    ["-y", "-v", "error", "-loop", "1", "-framerate", String(CAMERA.fps), "-i", png,
      "-t", String(CAMERA.seconds), "-vf", filters, "-f", "yuv4mpegpipe", clip],
    { encoding: "utf8" },
  );
  if (run.status !== 0) throw new Error(`ffmpeg couldn't make the camera clip:\n${run.stderr}`);
  return clip;
}
