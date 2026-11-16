import { describe, expect, it } from "vitest";
import { APP_ICONS, APP_SHORT_NAME, appManifest, iconByFile } from "./app-identity";

describe("app identity", () => {
  it("has a short name that fits under an iPhone icon (12 characters)", () => {
    expect(APP_SHORT_NAME.length).toBeLessThanOrEqual(12);
  });

  it("opens on Today, in its own window, and keeps the same id after a rename", () => {
    const manifest = appManifest();
    expect(manifest.start_url).toBe("/");
    expect(manifest.id).toBe("/");
    expect(manifest.display).toBe("standalone");
  });

  it("lists the 192 and 512 icons Android needs, plus a maskable one", () => {
    const icons = appManifest().icons ?? [];
    const has = (sizes: string, purpose: string) =>
      icons.some((icon) => icon.sizes === sizes && icon.purpose === purpose);
    expect(has("192x192", "any")).toBe(true);
    expect(has("512x512", "any")).toBe(true);
    expect(has("512x512", "maskable")).toBe(true);
  });

  it("points every manifest icon at a file the icon route serves", () => {
    for (const icon of appManifest().icons ?? []) {
      const file = icon.src.replace(/^\/icons\//, "");
      expect(iconByFile(file), icon.src).toBeDefined();
    }
  });

  it("has a 180 x 180 iPhone icon, kept out of the manifest", () => {
    const apple = iconByFile("apple-touch-icon.png");
    expect(apple?.size).toBe(180);
    expect(apple?.inManifest).toBe(false);
  });

  it("gives every icon a different file name", () => {
    const names = APP_ICONS.map((icon) => icon.file);
    expect(new Set(names).size).toBe(names.length);
  });

  it("knows no other files", () => {
    expect(iconByFile("favicon.ico")).toBeUndefined();
    expect(iconByFile("../secret.png")).toBeUndefined();
  });
});
