import { describe, expect, it } from "vitest";
import { APP_ICONS, iconUrl } from "./lib/app-identity";
import { config } from "./proxy";

// Next.js runs the proxy (the login check) only on addresses that match
// config.matcher. The matcher is a regular expression written as a path,
// so wrapping it in ^...$ gives the same yes/no for a plain address.
const runsLoginCheck = (path: string) =>
  config.matcher.some((pattern) => new RegExp(`^${pattern}$`).test(path));

describe("which addresses get the login check", () => {
  it("checks the app's pages", () => {
    for (const path of ["/", "/recipes", "/recipes/abc", "/foods", "/settings", "/scan", "/login"]) {
      expect(runsLoginCheck(path), path).toBe(true);
    }
  });

  it("skips the manifest: phones fetch it without your login cookie", () => {
    expect(runsLoginCheck("/manifest.webmanifest")).toBe(false);
  });

  it("skips every app icon", () => {
    for (const icon of APP_ICONS) {
      expect(runsLoginCheck(iconUrl(icon)), iconUrl(icon)).toBe(false);
    }
  });

  it("skips anything under /icons/, even without a .png ending", () => {
    expect(runsLoginCheck("/icons/new-icon")).toBe(false);
  });

  it("skips the icons iPhone looks for by itself at the top level", () => {
    // Older iPhones (and some apps that show link previews) ask for these
    // without reading the page. They don't exist (404), but must not get
    // a login page.
    expect(runsLoginCheck("/apple-touch-icon.png")).toBe(false);
    expect(runsLoginCheck("/apple-touch-icon-precomposed.png")).toBe(false);
    expect(runsLoginCheck("/favicon.ico")).toBe(false);
  });

  it("still skips the barcode reader and other static files", () => {
    expect(runsLoginCheck("/zxing/reader.wasm")).toBe(false);
    expect(runsLoginCheck("/_next/static/chunk.js")).toBe(false);
  });
});
