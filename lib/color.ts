// Pure colour maths for the app's palette (app/globals.css): no React,
// no browser. Used by lib/color.test.ts to check that every colour shows
// the hex CLAUDE.md promises and that text stays readable (contrast).
//
// The palette is written in OKLCH: oklch(lightness chroma hue). A screen
// shows sRGB (the red, green and blue of a hex like #4F6B2E), so to check
// a colour we convert it, the same way the browser does.

export type Rgb = [number, number, number]; // each 0 to 1
export type Oklch = { l: number; c: number; h: number; alpha: number };

/** "#4F6B2E" -> [0.31, 0.42, 0.18]. */
export function hexToRgb(hex: string): Rgb {
  const n = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255) as Rgb;
}

/** [0.31, 0.42, 0.18] -> "#4F6B2E" (rounded to the nearest of 256 steps). */
export function rgbToHex(rgb: Rgb): string {
  return (
    "#" +
    rgb
      .map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

// sRGB stores light on a curve (more steps for darks, like your eye);
// the maths needs plain "how much light", so these convert back and forth.
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/**
 * OKLCH to sRGB, with Björn Ottosson's published OKLab matrices (the ones
 * in the CSS Color 4 spec). A colour a screen can't show (outside sRGB) is
 * clipped to the nearest edge, like browsers do today; `inGamut` says
 * whether that happened.
 */
export function oklchToRgb({ l, c, h }: Pick<Oklch, "l" | "c" | "h">): { rgb: Rgb; inGamut: boolean } {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  // The eye's three cone responses (long, medium, short), already cubed
  // back from OKLab's cube-root scale.
  const l3 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m3 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s3 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
  const inGamut = linear.every((v) => v >= -0.0005 && v <= 1.0005);
  const rgb = linear.map((v) => fromLinear(Math.min(1, Math.max(0, v)))) as Rgb;
  return { rgb, inGamut };
}

/** Relative luminance, WCAG's "how bright", 0 (black) to 1 (white). */
export function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 (same) to 21 (black on white). Order doesn't matter. */
export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** A see-through colour drawn over a solid one: what you actually see. */
export function over(top: Rgb, alpha: number, below: Rgb): Rgb {
  return top.map((c, i) => c * alpha + below[i] * (1 - alpha)) as Rgb;
}

/**
 * Reads one colour as written in globals.css:
 *   oklch(49.09% 0.0938 130)
 *   oklch(49.09% 0.0938 var(--accent-h))
 *   oklch(75.93% 0.1016 calc(var(--accent-h) + 6.4))
 *   oklch(0% 0 0 / 11.5%)
 * `vars` gives the numbers for var(--name). Returns null for anything
 * else (var(--primary), sizes, ...).
 */
export function parseOklch(value: string, vars: Record<string, number> = {}): Oklch | null {
  const m = value
    .trim()
    .match(/^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+(.+?)(?:\s*\/\s*([\d.]+)%)?\s*\)$/);
  if (!m) return null;
  const h = parseHue(m[3], vars);
  if (h === null) return null;
  return {
    l: Number(m[1]) / 100,
    c: Number(m[2]),
    h,
    alpha: m[4] === undefined ? 1 : Number(m[4]) / 100,
  };
}

function parseHue(text: string, vars: Record<string, number>): number | null {
  const t = text.trim();
  if (/^-?[\d.]+$/.test(t)) return Number(t);
  const v = t.match(/^var\(--([\w-]+)\)$/);
  if (v) return vars[v[1]] ?? null;
  const calc = t.match(/^calc\(\s*var\(--([\w-]+)\)\s*([+-])\s*([\d.]+)\s*\)$/);
  if (calc && vars[calc[1]] !== undefined) {
    const base = vars[calc[1]];
    return calc[2] === "+" ? base + Number(calc[3]) : base - Number(calc[3]);
  }
  return null;
}

/**
 * The custom properties ("--name: value;") written straight inside one
 * CSS block: the first block that opens after the text `opening`
 * matches. Blocks nested inside it are skipped. Comments are removed
 * first.
 */
export function propertiesIn(css: string, opening: RegExp): Record<string, string> {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const found = opening.exec(text);
  if (!found) return {};
  let i = text.indexOf("{", found.index + found[0].length) + 1;
  if (i === 0) return {};
  let depth = 1;
  let own = "";
  for (; i < text.length && depth > 0; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (depth === 1) own += ch;
  }
  const out: Record<string, string> = {};
  for (const m of own.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
