// Records what the page shows, frame by frame, and turns it into video.
//
// Playwright can save a .webm by itself, but only at the screen's CSS
// size (393 px wide, so blurry on a sharp screen) and squeezed hard. So
// instead this takes screenshots back to back at the phone's real 2x
// resolution (about 23 a second), each with the time it was taken, and
// ffmpeg (a free video tool) stitches them into an H.264 .mp4, the format
// every browser and phone plays. Each frame stays on for as long as it
// was on screen, so the video keeps the real pacing.
//
// No ffmpeg on this computer? Then record-demo.ts keeps Playwright's own
// .webm instead (and skips the short loop: cutting it needs ffmpeg).

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { CDPSession, Page } from "@playwright/test";

type Frame = { file: string; t: number };

/**
 * Where ffmpeg is: $FFMPEG_PATH, then `ffmpeg` on the PATH, then the
 * ffmpeg-static npm package if it's installed. null if none works.
 */
export async function findFfmpeg(): Promise<string | null> {
  const candidates = [process.env.FFMPEG_PATH, "ffmpeg"];
  try {
    // A variable, so TypeScript doesn't insist the package is installed:
    // it's optional (npm install --no-save ffmpeg-static).
    const optional = "ffmpeg-static";
    const mod = (await import(optional)) as { default?: string };
    candidates.push(mod.default);
  } catch {
    // Not installed: fine.
  }
  for (const bin of candidates) {
    if (bin && spawnSync(bin, ["-version"], { stdio: "ignore" }).status === 0) return bin;
  }
  return null;
}

export class Film {
  private readonly frames: Frame[] = [];
  private readonly marks = new Map<string, number>();
  private readonly startedAt = Date.now();
  private rolling = true;
  private loop: Promise<void> = Promise.resolve();
  /** Screenshots that failed, and why the first one did (see encode). */
  private failures = 0;
  private firstError: unknown;

  private constructor(
    private readonly cdp: CDPSession,
    private readonly dir: string,
    private readonly viewport: { width: number; height: number },
    private readonly scale: number,
  ) {}

  /** Starts recording `page`, at its device pixel ratio. Frames go into `dir` (emptied first). */
  static async roll(page: Page, dir: string) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const viewport = page.viewportSize();
    if (!viewport) throw new Error("Film: the page needs a fixed viewport");
    const scale = await page.evaluate(() => window.devicePixelRatio);
    const film = new Film(await page.context().newCDPSession(page), dir, viewport, scale);
    film.loop = film.shoot();
    return film;
  }

  /** Screenshot after screenshot until stop(). */
  private async shoot() {
    while (this.rolling) {
      try {
        // Where the page is scrolled to right now: the screenshot's area
        // is measured from the top of the page, so it has to follow the
        // scroll (this is what Playwright's own page.screenshot does).
        const { cssVisualViewport: view } = await this.cdp.send("Page.getLayoutMetrics");
        const t = Date.now();
        const { data } = await this.cdp.send("Page.captureScreenshot", {
          format: "jpeg",
          quality: 92,
          optimizeForSpeed: true,
          captureBeyondViewport: false,
          clip: { x: view.pageX, y: view.pageY, ...this.viewport, scale: this.scale },
        });
        // Scrolled in between the two calls? Then the picture was cut from
        // the wrong place (the header and tab bar would jump), so it's
        // dropped and the previous frame stays on a little longer.
        // (finger.ts's scrollTo moves in steps, so few frames are lost.)
        const { cssVisualViewport: after } = await this.cdp.send("Page.getLayoutMetrics");
        if (after.pageX !== view.pageX || after.pageY !== view.pageY) continue;
        const file = path.join(this.dir, `f${String(this.frames.length).padStart(5, "0")}.jpg`);
        fs.writeFileSync(file, Buffer.from(data, "base64"));
        this.frames.push({ file, t });
      } catch (error) {
        // A screenshot can fail while a new page is loading. The previous
        // frame simply stays on a little longer.
        this.failures++;
        this.firstError ??= error;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
  }

  /** Remembers "now" under a name, to cut the video there later. */
  mark(name: string) {
    this.marks.set(name, Date.now());
  }

  /** The time saved under `name`, in ms since the recording started. */
  at(name: string): number {
    const t = this.marks.get(name);
    if (t === undefined) throw new Error(`Film: no mark called "${name}"`);
    return t - this.startedAt;
  }

  /** Stops recording; the mark "end" is now. */
  async stop() {
    this.mark("end");
    this.rolling = false;
    await this.loop;
    await this.cdp.detach();
  }

  /**
   * Writes an ffmpeg "concat" list: each frame and how long it stayed on
   * screen, from `from` to `to` (ms since the start). The frame that was
   * showing at `from` opens the clip, so a quiet stretch isn't skipped.
   */
  private frameList(name: string, from: number, to: number): { list: string; seconds: number } {
    const start = this.startedAt + from;
    const end = this.startedAt + to;
    let first = this.frames.findIndex((f) => f.t > start) - 1;
    if (first < 0) first = 0;
    const lines = ["ffconcat version 1.0"];
    let total = 0;
    let lastFile = "";
    for (let i = first; i < this.frames.length && this.frames[i].t < end; i++) {
      const shownFrom = Math.max(this.frames[i].t, start);
      const shownTo = Math.min(this.frames[i + 1]?.t ?? end, end);
      const seconds = (shownTo - shownFrom) / 1000;
      if (seconds <= 0) continue;
      lastFile = `file '${path.basename(this.frames[i].file)}'`;
      lines.push(lastFile, `duration ${seconds.toFixed(4)}`);
      total += seconds;
    }
    // ffmpeg ignores the last entry's duration unless the file is listed
    // once more after it.
    if (lastFile) lines.push(lastFile);
    const list = path.join(this.dir, `${name}.txt`);
    fs.writeFileSync(list, lines.join("\n") + "\n");
    return { list, seconds: total };
  }

  /**
   * Encodes one or more stretches of the recording, joined end to end
   * with a short crossfade, into an H.264 .mp4. `fade` (a colour) fades
   * in from it at the start and out to it at the end, so a loop can meet
   * itself smoothly.
   */
  encode(
    ffmpeg: string,
    out: string,
    clips: { from: number; to: number }[],
    { fade, crossfade = 0.4 }: { fade?: string; crossfade?: number } = {},
  ) {
    // Every screenshot failing would otherwise show up as a puzzling
    // ffmpeg error about an empty list.
    if (this.frames.length === 0) {
      throw new Error(`Film: no frames captured (${this.failures} failed; first error: ${this.firstError})`);
    }
    const parts = clips.map((c, i) => this.frameList(`clip${i}`, c.from, c.to));
    const args = ["-y", "-hide_banner", "-loglevel", "error"];
    for (const p of parts) args.push("-f", "concat", "-safe", "0", "-i", p.list);

    // Every clip at a steady 25 frames per second (about what the
    // screenshots manage), then joined.
    const filters = parts.map((_, i) => `[${i}:v]fps=25,settb=AVTB,setpts=PTS-STARTPTS[c${i}]`);
    let last = "c0";
    let length = parts[0].seconds;
    for (let i = 1; i < parts.length; i++) {
      const offset = Math.max(0, length - crossfade);
      filters.push(`[${last}][c${i}]xfade=transition=fade:duration=${crossfade}:offset=${offset.toFixed(3)}[x${i}]`);
      last = `x${i}`;
      length = offset + parts[i].seconds;
    }
    if (fade) {
      const outAt = Math.max(0, length - 0.35).toFixed(3);
      filters.push(`[${last}]fade=t=in:d=0.35:color=${fade},fade=t=out:st=${outAt}:d=0.35:color=${fade}[faded]`);
      last = "faded";
    }
    filters.push(`[${last}]format=yuv420p[v]`);

    args.push(
      "-filter_complex", filters.join(";"),
      "-map", "[v]",
      // H.264 at constant quality (CRF 24: sharp text, small file),
      // tuned for flat screen content, playable everywhere.
      "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-tune", "animation",
      "-profile:v", "high", "-movflags", "+faststart", "-an",
      out,
    );
    fs.mkdirSync(path.dirname(out), { recursive: true });
    // Relative frame names in the lists: run from the frames' folder.
    const result = spawnSync(ffmpeg, args, { cwd: this.dir, encoding: "utf8" });
    if (result.status !== 0) throw new Error(`ffmpeg failed for ${out}:\n${result.stderr}`);
    return { seconds: length };
  }
}
