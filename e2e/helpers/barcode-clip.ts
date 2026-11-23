// The camera picture for the demo's real scan: a can of baked beans lying
// on a kitchen counter, with the real EAN-13 barcode on its label, filmed
// as if by a phone held in a hand (it drifts into place, then wobbles a
// little).
//
// How it reaches the app: Chromium can pretend a video file is its camera
// (--use-fake-device-for-media-stream with
// --use-file-for-fake-video-capture=<file>, see record-demo.ts). The app's
// own scanner then reads the barcode off that "camera" exactly as on a
// phone. No app code knows about this.
//
// Made in two steps, both on this computer:
// 1. The still scene is drawn as a web page (plain HTML and CSS, the
//    barcode as SVG bars) and saved as a PNG by the browser.
// 2. ffmpeg moves a phone-sized window over that picture (the hand) and
//    writes a .y4m file, the raw video format Chromium's fake camera reads.
//    It's big (about 70 MB), so it lives in test-results/, never in git.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { Browser } from "@playwright/test";

/**
 * The camera's picture. Square, because that's what the app gets anyway:
 * it asks for 1280 x 720, and Chromium's fake camera, which can only crop
 * and shrink a file, hands over the middle 720 x 720 of anything 720 tall.
 * The phone screen (object-cover) then shows the middle strip of it, about
 * 330 px wide. Moving at 15 frames a second, for 6 s, then it loops.
 */
const CAMERA = { width: 720, height: 720, fps: 15, seconds: 6 };
/**
 * What the camera sees of the scene, before it's scaled down to CAMERA.
 * Sized so the barcode's bars span about three quarters of the scan window
 * (the window is about 265 x 165 camera pixels), about 2 camera pixels per
 * bar width: sharp enough for the reader, small enough to look real.
 */
const VIEW = { width: 1700, height: 1700 };
/** The scene is drawn bigger than what the camera sees, so the window can move over it. */
const SCENE = { width: 2400, height: 3500 };

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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${barHeight + 11 * module}"
      style="font-family: 'Courier New', monospace; fill: #111">
    ${bars}
    ${text(quiet - 4, code[0])}
    ${text(quiet + 3 + 21, code.slice(1, 7))}
    ${text(quiet + 50 + 21, code.slice(7))}
  </svg>`;
}

/**
 * The still scene: a warm oak counter, and a can lying on its side, label
 * up, its barcode where the phone's scan window will be. A plain own-brand
 * label (no real brand's look), only the barcode is the real product's.
 */
function sceneHtml(code: string) {
  return `<!doctype html><html><body style="margin:0">
  <div style="position:relative; width:${SCENE.width}px; height:${SCENE.height}px; overflow:hidden;
      background:
        repeating-linear-gradient(94deg, rgba(90,60,30,.07) 0 3px, transparent 3px 19px),
        repeating-linear-gradient(91deg, rgba(255,240,220,.08) 0 7px, transparent 7px 41px),
        radial-gradient(120% 80% at 40% 30%, #d9c2a0, #b8986f 70%, #a58560);">
    <svg width="100%" height="100%" style="position:absolute; inset:0; opacity:.35; mix-blend-mode:multiply">
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.09" numOctaves="3" seed="7"/>
        <feColorMatrix values="0 0 0 0 .45  0 0 0 0 .3  0 0 0 0 .15  0 0 0 .9 0"/></filter>
      <rect width="100%" height="100%" filter="url(#grain)"/>
    </svg>
    <!-- The can, lying on its side, turned a little; shifted left so its
         barcode (on the right of the label) is in the middle. -->
    <div style="position:absolute; left:calc(50% - 150px); top:50%; width:1180px; height:700px;
        transform: translate(-50%, -50%) rotate(-3deg);">
      <div style="position:absolute; inset:40px -10px -40px 30px; border-radius:60px; background:rgba(40,25,10,.45); filter:blur(36px)"></div>
      <!-- Rims at each end. -->
      <div style="position:absolute; left:0; top:0; bottom:0; width:70px; border-radius:40px 16px 16px 40px;
          background: linear-gradient(180deg, #6d6d6d, #e9e9e9 30%, #9a9a9a 55%, #f2f2f2 70%, #5c5c5c)"></div>
      <div style="position:absolute; right:0; top:0; bottom:0; width:70px; border-radius:16px 40px 40px 16px;
          background: linear-gradient(180deg, #6d6d6d, #e9e9e9 30%, #9a9a9a 55%, #f2f2f2 70%, #5c5c5c)"></div>
      <!-- The label. -->
      <div style="position:absolute; left:62px; right:62px; top:14px; bottom:14px; overflow:hidden;
          background:#c8512b; display:flex; align-items:center; justify-content:space-between; padding:0 90px;
          font-family: Georgia, serif; color:#fff7e8;">
        <div style="font-size:84px; line-height:1.02; font-weight:bold">Baked<br>Beans
          <div style="font-size:34px; font-weight:normal; font-style:italic; margin-top:18px">in tomato sauce · 415 g</div>
        </div>
        <div style="background:#fff; padding:24px 26px 18px; border-radius:10px">${barcodeSvg(code, 5)}</div>
      </div>
      <!-- Light and shade round the cylinder. -->
      <div style="position:absolute; left:62px; right:62px; top:14px; bottom:14px; pointer-events:none;
          background: linear-gradient(180deg, rgba(0,0,0,.42), rgba(0,0,0,.04) 22%, rgba(255,255,255,.22) 36%,
            rgba(255,255,255,0) 50%, rgba(0,0,0,.08) 72%, rgba(0,0,0,.5))"></div>
    </div>
  </div></body></html>`;
}

/** Where the barcode's middle is in the scene, so the camera can start on it. */
async function drawScene(browser: Browser, code: string, png: string) {
  const page = await browser.newPage({ viewport: SCENE, deviceScaleFactor: 1 });
  try {
    await page.setContent(sceneHtml(code));
    await page.screenshot({ path: png });
    const box = (await page.locator("svg").last().boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  } finally {
    await page.close();
  }
}

/**
 * Makes (or reuses) the fake camera's video for `code` and returns its
 * path. `aim` is where on the camera picture the scan window is, as a
 * fraction of its width and height (0.5, 0.5 = the middle).
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

  // The window's top-left corner when the barcode sits under the scan
  // window, kept inside the scene.
  const restX = Math.round(barcode.x - aim.x * VIEW.width);
  const restY = Math.round(barcode.y - aim.y * VIEW.height);
  // How far away the phone starts (the barcode well outside the scan
  // window, so the first second or two shows just counter and can), and
  // the furthest the window moves from rest (arrival plus wobble, below).
  const from = { x: -250, y: 700 };
  const reach = { left: -from.x + 46, right: 46, up: 36, down: from.y + 36 };
  if (
    restX - reach.left < 0 ||
    restX + reach.right > SCENE.width - VIEW.width ||
    restY - reach.up < 0 ||
    restY + reach.down > SCENE.height - VIEW.height
  ) {
    throw new Error(`The camera would move off the scene (rest ${restX}, ${restY}): move the can or enlarge SCENE`);
  }
  // ffmpeg expressions, `t` in seconds. `arrive` is 1 while the phone is
  // still away, then glides to 0 between 1.8 s and 4.2 s (smoothstep: it
  // speeds up, then slows to a stop, as a hand does). After that only the
  // hand's wobble: two slow sways at different speeds, so it never looks
  // mechanical. Commas are written \, because a bare comma would end the
  // filter (see ffmpeg's filtergraph escaping).
  // The reader reads one line across the bars, so it picks the code up as
  // soon as the bars cross the window, a little before the phone settles,
  // as a real scanner does: about 2.5 s after the camera opens.
  const p = "clip((t-1.8)/2.4\\,0\\,1)";
  const arrive = `(1-(3*${p}*${p}-2*${p}*${p}*${p}))`;
  const x = `${restX}+34*sin(2*PI*t*0.55)+12*sin(2*PI*t*1.7)+${from.x}*${arrive}`;
  const y = `${restY}+26*sin(2*PI*t*0.45+1)+10*sin(2*PI*t*2.1)+${from.y}*${arrive}`;
  const tilt = `0.018*sin(2*PI*t*0.4)+0.08*${arrive}`;
  const filters = [
    `rotate=a=${tilt}:c=0xb0906a:ow=iw:oh=ih`,
    `crop=w=${VIEW.width}:h=${VIEW.height}:x=${x}:y=${y}`,
    `scale=${CAMERA.width}:${CAMERA.height}`,
    // A phone camera's softness and grain.
    "gblur=sigma=0.5",
    "noise=alls=4:allf=t",
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
