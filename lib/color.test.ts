import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrast, hexToRgb, oklchToRgb, over, parseOklch, propertiesIn, rgbToHex, type Rgb } from "./color";

// The real palette, read from app/globals.css, so this test fails the
// moment a colour there drifts from CLAUDE.md or loses its contrast.
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const LIGHT = propertiesIn(css, /^:root/m);
const DARK = { ...LIGHT, ...propertiesIn(css, /@media \(prefers-color-scheme: dark\)\s*\{\s*:root/) };
const THEMES = { light: LIGHT, dark: DARK };
type Theme = keyof typeof THEMES;
const MATCHA_HUE = Number(LIGHT["accent-h"]);

/**
 * What a token looks like on screen. A see-through one (a border) is
 * shown over `below`, the page background unless said otherwise.
 */
function shown(theme: Theme, name: string, hue = MATCHA_HUE, below?: Rgb): Rgb {
  const props = THEMES[theme];
  let value = props[name];
  // --ring: var(--primary) and the like: follow the link.
  for (let hops = 0; value?.startsWith("var(--") && hops < 5; hops++) {
    value = props[value.slice(6, -1)];
  }
  const parsed = value === undefined ? null : parseOklch(value, { "accent-h": hue });
  if (parsed === null) throw new Error(`--${name} in ${theme} isn't a colour this test can read: ${value}`);
  const { rgb } = oklchToRgb(parsed);
  if (parsed.alpha === 1) return rgb;
  return over(rgb, parsed.alpha, below ?? shown(theme, "background", hue));
}

describe("palette: every colour shows the hex in CLAUDE.md", () => {
  const LIGHT_HEX: Record<string, string> = {
    background: "#FFFFFF",
    foreground: "#171717",
    card: "#F0F0F0",
    "card-foreground": "#171717",
    popover: "#FFFFFF",
    "popover-foreground": "#171717",
    primary: "#4F6B2E",
    "primary-foreground": "#FFFFFF",
    secondary: "#F0F0F0",
    "secondary-foreground": "#171717",
    muted: "#F0F0F0",
    "muted-foreground": "#616161",
    accent: "#E8E8E8",
    "accent-foreground": "#171717",
    destructive: "#A8432F",
    border: "#E2E2E2",
    input: "#E2E2E2",
    "field-border": "#858585",
    ring: "#4F6B2E",
    "matcha-soft": "#78855A",
    highlight: "#F2C94C",
    "highlight-foreground": "#171717",
    camera: "#141414",
    "camera-foreground": "#EDEDED",
    "camera-accent": "#93C07F",
  };
  const DARK_HEX: Record<string, string> = {
    background: "#141414",
    foreground: "#EDEDED",
    card: "#1F1F1F",
    "card-foreground": "#EDEDED",
    popover: "#2A2A2A",
    "popover-foreground": "#EDEDED",
    raised: "#333333",
    primary: "#93C07F",
    "primary-foreground": "#141414",
    secondary: "#1F1F1F",
    "secondary-foreground": "#EDEDED",
    muted: "#1F1F1F",
    "muted-foreground": "#A3A3A3",
    accent: "#2A2A2A",
    "accent-foreground": "#EDEDED",
    destructive: "#E08470",
    border: "#2E2E2E",
    input: "#2E2E2E",
    "field-border": "#7A7A7A",
    ring: "#93C07F",
    "matcha-soft": "#76855A",
    highlight: "#E9C25A",
    "highlight-foreground": "#141414",
    // The camera keeps its own colours in dark mode too.
    camera: "#141414",
    "camera-foreground": "#EDEDED",
    "camera-accent": "#93C07F",
  };

  it.each(Object.entries(LIGHT_HEX))("light --%s is %s", (name, hex) => {
    expect(rgbToHex(shown("light", name))).toBe(hex);
  });
  it.each(Object.entries(DARK_HEX))("dark --%s is %s", (name, hex) => {
    expect(rgbToHex(shown("dark", name))).toBe(hex);
  });
});

// Text sits on these. Each text colour must be at least 4.5:1 on each.
// Dark mode has one more: --raised, the step up inside a sheet (tiles,
// chips, greyed buttons and hovers there; surface-raised in globals.css).
const SURFACES = { light: ["background", "card", "popover", "accent", "muted"], dark: ["background", "card", "popover", "accent", "muted", "raised"] };
const TEXT = ["foreground", "muted-foreground", "primary", "destructive"];

function contrastChecks(theme: Theme, hue: number) {
  const c = (a: string, b: string) => contrast(shown(theme, a, hue), shown(theme, b, hue));
  const checks: { what: string; ratio: number; needs: number }[] = [];
  for (const surface of SURFACES[theme]) {
    for (const text of TEXT) checks.push({ what: `${text} on ${surface}`, ratio: c(text, surface), needs: 4.5 });
    // A focus ring and a box's edge are shapes, not text: 3:1.
    checks.push({ what: `ring on ${surface}`, ratio: c("ring", surface), needs: 3 });
  }
  // Boxes you type in sit on the page, tiles and sheets. Never on dark
  // "raised" (a tile inside a sheet): they'd be under 3:1 there, which is
  // why CLAUDE.md and globals.css (surface-raised) rule it out. The same
  // goes for red buttons below.
  for (const surface of ["background", "card", "popover"]) {
    checks.push({ what: `field-border on ${surface}`, ratio: c("field-border", surface), needs: 3 });
  }
  // The red button (Delete, "Yes"): red text on a 10% red tint, on each
  // surface a red button sits on.
  for (const surface of ["background", "card", "popover"]) {
    const tint = over(shown(theme, "destructive", hue), 0.1, shown(theme, surface, hue));
    checks.push({
      what: `destructive on its tint over ${surface}`,
      ratio: contrast(shown(theme, "destructive", hue), tint),
      needs: 4.5,
    });
  }
  // The label on a matcha button, and on its hover (matcha at 90%).
  checks.push({ what: "primary-foreground on primary", ratio: c("primary-foreground", "primary"), needs: 4.5 });
  const hover = over(shown(theme, "primary", hue), 0.9, shown(theme, "background", hue));
  checks.push({
    what: "primary-foreground on primary hover",
    ratio: contrast(shown(theme, "primary-foreground", hue), hover),
    needs: 4.5,
  });
  checks.push({ what: "highlight-foreground on highlight", ratio: c("highlight-foreground", "highlight"), needs: 4.5 });
  return checks;
}

describe("palette: contrast", () => {
  for (const theme of ["light", "dark"] as const) {
    it.each(contrastChecks(theme, MATCHA_HUE))(`${theme}: $what`, ({ ratio, needs }) => {
      expect(ratio).toBeGreaterThanOrEqual(needs);
    });
  }

  it("the lowest plain text pair is the one CLAUDE.md names (red inside a dark sheet, 4.63:1)", () => {
    const text = [...contrastChecks("light", MATCHA_HUE), ...contrastChecks("dark", MATCHA_HUE)].filter(
      (check) => check.needs === 4.5 && TEXT.some((t) => check.what.startsWith(`${t} on `)) && !check.what.includes("tint"),
    );
    const lowest = text.reduce((a, b) => (b.ratio < a.ratio ? b : a));
    expect(lowest.what).toBe("destructive on raised");
    expect(lowest.ratio).toBeCloseTo(4.63, 2);
  });
});

// Accent presets ("Next feature: make it yours") change only --accent-h.
// These are the hues that fit the app's meaning (not red: over budget;
// not yellow: where you are). Every one must pass everything matcha does.
const ACCENT_CANDIDATES = { matcha: 130, ocean: 240, indigo: 272, plum: 330, teal: 195 };

describe("palette: an accent preset only changes the hue", () => {
  for (const [name, hue] of Object.entries(ACCENT_CANDIDATES)) {
    for (const theme of ["light", "dark"] as const) {
      const accentChecks = contrastChecks(theme, hue).filter((check) => /primary|ring/.test(check.what));
      it.each(accentChecks)(`${name} (${hue}), ${theme}: $what`, ({ ratio, needs }) => {
        expect(ratio).toBeGreaterThanOrEqual(needs);
      });
    }
  }

  it("teal at matcha's chroma is too colourful for a screen, so a teal preset needs less chroma", () => {
    const primary = parseOklch(LIGHT.primary, { "accent-h": 195 })!;
    expect(oklchToRgb(primary).inGamut).toBe(false);
  });
});

describe("surface-raised", () => {
  // The dark-mode step inside sheets. If one of these went missing, that
  // thing would be darker than its sheet again (greyed buttons would look
  // sunk in) and no colour above would notice.
  it("moves the tile, muted, secondary and hover colours up to --raised in dark mode", () => {
    const raised = propertiesIn(css, /@utility surface-raised\s*\{\s*@media \(prefers-color-scheme: dark\)/);
    expect(raised).toEqual({
      card: "var(--raised)",
      muted: "var(--raised)",
      secondary: "var(--raised)",
      accent: "var(--raised)",
    });
  });
});

describe("palette: see-through borders", () => {
  // Same as the old solid grey on the page, and still visible on tiles
  // and sheets (a solid grey would match or vanish into them).
  it.each([
    ["light", "background", "#E2E2E2"],
    ["light", "card", "#D4D4D4"],
    ["dark", "background", "#2E2E2E"],
    ["dark", "card", "#383838"],
    ["dark", "popover", "#414141"],
    ["dark", "raised", "#494949"],
  ] as const)("%s border on %s shows as %s", (theme, surface, hex) => {
    expect(rgbToHex(shown(theme, "border", MATCHA_HUE, shown(theme, surface)))).toBe(hex);
  });

  it("box edges stay solid (they must be 3:1 on every surface)", () => {
    expect(parseOklch(LIGHT["field-border"])?.alpha).toBe(1);
    expect(parseOklch(DARK["field-border"])?.alpha).toBe(1);
  });
});

describe("color helpers", () => {
  it("round-trips hex", () => {
    expect(rgbToHex(hexToRgb("#4F6B2E"))).toBe("#4F6B2E");
  });

  it("reads plain, var(), calc() and see-through OKLCH", () => {
    const plain = parseOklch("oklch(49.09% 0.0938 130)")!;
    expect(plain.l).toBeCloseTo(0.4909, 6);
    expect(plain).toMatchObject({ c: 0.0938, h: 130, alpha: 1 });
    expect(parseOklch("oklch(49.09% 0.0938 var(--accent-h))", { "accent-h": 240 })?.h).toBe(240);
    expect(parseOklch("oklch(75.93% 0.1016 calc(var(--accent-h) + 6.4))", { "accent-h": 130 })?.h).toBeCloseTo(136.4);
    expect(parseOklch("oklch(59.47% 0.0638 calc(var(--accent-h) - 8))", { "accent-h": 130 })?.h).toBe(122);
    expect(parseOklch("oklch(0% 0 0 / 11.5%)")?.alpha).toBeCloseTo(0.115);
    expect(parseOklch("var(--primary)")).toBeNull();
    expect(parseOklch("oklch(50% 0.1 var(--unknown))")).toBeNull();
  });

  it("measures contrast like WCAG", () => {
    expect(contrast(hexToRgb("#000000"), hexToRgb("#FFFFFF"))).toBeCloseTo(21, 5);
    expect(contrast(hexToRgb("#616161"), hexToRgb("#FFFFFF"))).toBeCloseTo(6.19, 2);
  });

  it("reads a block's own custom properties, not a nested block's", () => {
    const sample = ":root { --a: 1; } @media (x) { :root { --a: 2; --b: 3; } }";
    expect(propertiesIn(sample, /^:root/m)).toEqual({ a: "1" });
    expect(propertiesIn(sample, /@media \(x\)\s*\{\s*:root/)).toEqual({ a: "2", b: "3" });
  });
});
