import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The layer tokens in app/globals.css (see "Layers" there): what sits on
// top of what. This fails if the order changes by accident, or if a
// component floats something over the page with a number of its own.
const root = fileURLToPath(new URL("..", import.meta.url));
const css = readFileSync(join(root, "app/globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

function layer(name: string): number {
  const matches = [...css.matchAll(new RegExp(`--z-${name}:\\s*(\\d+);`, "g"))];
  expect(matches, `--z-${name} set once in globals.css`).toHaveLength(1);
  return Number(matches[0][1]);
}

// Lowest first.
const ORDER = ["raised", "sticky", "tab-bar", "toast", "overlay"];

describe("layers", () => {
  it("stack in this order: raised < sticky < tab bar < Undo message < overlay", () => {
    const values = ORDER.map(layer);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
    expect(new Set(values).size).toBe(values.length);
  });

  it("each has its class, reading the variable", () => {
    for (const name of ORDER) {
      expect(css).toMatch(new RegExp(`@utility z-${name}\\s*\\{\\s*z-index: var\\(--z-${name}\\);`));
    }
  });

  // The bug this guards: the tab bar had no layer, so rows went over it.
  it.each([
    ["tab-bar.tsx", "z-tab-bar"],
    ["offline-strip.tsx", "z-sticky"],
    ["undo-toast.tsx", "z-toast"],
    ["scanner.tsx", "z-overlay"],
    ["bottom-sheet.tsx", "z-overlay"],
    ["log-out-button.tsx", "z-raised"],
  ])("%s is on %s", (file, cls) => {
    expect(readFileSync(join(root, "components", file), "utf8")).toMatch(new RegExp(`\\b${cls}\\b`));
  });

  // A raw z-10 is only allowed inside a parent with `isolate`, where it
  // can't reach the tab bar. These are the files that do that.
  const LOCAL = ["entry-row.tsx", "swap-stack.tsx"];

  function sources(dir: string): string[] {
    return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? sources(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [],
    );
  }

  it("no component uses a raw z-index except inside an isolated parent", () => {
    for (const file of [...sources("app"), ...sources("components")]) {
      const text = readFileSync(join(root, file), "utf8");
      const raw = text.match(/(?<![\w-])-?z-(\d+|\[[^\]]*\]|\([^)]*\))(?![\w-])|zIndex/g) ?? [];
      const name = file.split(/[\\/]/).pop()!;
      if (LOCAL.includes(name)) {
        expect(text, `${file} isolates its z-index`).toMatch(/\bisolate\b/);
      } else {
        expect(raw, `${file}: use a layer class (z-tab-bar...) instead`).toEqual([]);
      }
    }
  });
});
