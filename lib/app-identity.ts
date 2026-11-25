// The app's name, icons and colours for the home screen, in one place.
// Renaming the app is this file, plus the places that can't read it:
// README.md, CLAUDE.md and the Open Food Facts user agent
// (lib/open-food-facts.ts). The login email names no app (its Supabase
// template is shared with the habit tracker). Page titles add the name
// themselves (the title template in app/layout.tsx). The icon has no
// letters, so it doesn't change. It was "Meal Cost Tracker" until
// 2026-11-21 (the repo and Vercel project keep that name), then "Staple"
// until 2026-11-23. Live at trybitewise.vercel.app.
import type { MetadataRoute } from "next";

export const APP_NAME = "Bitewise";

/**
 * The name under the icon on the home screen. iPhone cuts names off at
 * about 12 characters, so this one has to be short. "Bitewise" (8) is.
 */
export const APP_SHORT_NAME = "Bitewise";

export const APP_DESCRIPTION = "Cheap meals on repeat, without getting bored.";

/**
 * The page background, so the phone's status bar blends into the page.
 * Copied from --background in app/globals.css: a manifest and a <meta> tag
 * can't read CSS variables. Change one, change the other (lib/color.test.ts
 * fails until you do).
 */
export const PAGE_BACKGROUND = { light: "#FFFFFF", dark: "#141414" } as const;

/**
 * The icon's colours, from app/globals.css: matcha (--primary, light)
 * and the white drawn on it (--primary-foreground, light). The icon is
 * drawn by next/og, which can't read CSS variables. lib/color.test.ts
 * checks these and PAGE_BACKGROUND still match.
 */
export const ICON_GREEN = "#4F6B2E";
export const ICON_WHITE = "#FFFFFF";

/**
 * - "rounded": a rounded square, for browser tabs and Android's "any" icon.
 * - "full": fills the whole square, no rounding. iPhone rounds the corners
 *   itself, and it shows see-through corners as black.
 * - "maskable": fills the square with the drawing kept small in the middle,
 *   because Android cuts it to its own shape (circle, squircle...).
 */
export type IconShape = "rounded" | "full" | "maskable";

export type AppIconFile = {
  file: string;
  size: number;
  shape: IconShape;
  /** Listed in the manifest (Android). The iPhone icon has its own tag. */
  inManifest: boolean;
};

/** Every icon PNG, served at /icons/<file> by app/icons/[file]/route.tsx. */
export const APP_ICONS: readonly AppIconFile[] = [
  { file: "icon-192.png", size: 192, shape: "rounded", inManifest: true },
  { file: "icon-512.png", size: 512, shape: "rounded", inManifest: true },
  { file: "icon-maskable-512.png", size: 512, shape: "maskable", inManifest: true },
  // 180 x 180 is what iPhones ask for.
  { file: "apple-touch-icon.png", size: 180, shape: "full", inManifest: false },
];

/**
 * Raise this whenever the drawing changes (components/app-icon.tsx).
 * Phones keep an icon by its address, so a new drawing at the same address
 * can go unseen for weeks; "?v=3" is a new address, so they fetch it again.
 * The route ignores it. 1 = the first macro ring (2026-11-23); 2 = equal
 * pieces with straight gaps (2026-11-25); 3 = wider gaps (6 units) and a
 * maskable ring as big as the others (2026-11-25).
 */
export const ICON_VERSION = 3;

export const iconUrl = (icon: AppIconFile) => `/icons/${icon.file}?v=${ICON_VERSION}`;

export function iconByFile(file: string): AppIconFile | undefined {
  return APP_ICONS.find((icon) => icon.file === file);
}

/**
 * The web app manifest: what Android (and iPhone, partly) reads when you
 * add the app to the home screen.
 */
export function appManifest(): MetadataRoute.Manifest {
  return {
    // `id` is the app's identity. It stays "/" forever, so after a rename
    // Android still knows it's the same app and updates the icon in place.
    id: "/",
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    start_url: "/", // opens on Today (or Login when you're logged out)
    scope: "/",
    // Its own window, without the browser's address bar.
    display: "standalone",
    // A manifest takes one colour each, so these are the light ones. Dark
    // mode's status bar comes from the theme-color tags (app/layout.tsx);
    // Android's splash screen stays white for the half second it shows.
    background_color: PAGE_BACKGROUND.light,
    theme_color: PAGE_BACKGROUND.light,
    icons: APP_ICONS.filter((icon) => icon.inManifest).map((icon) => ({
      src: iconUrl(icon),
      sizes: `${icon.size}x${icon.size}`,
      type: "image/png",
      purpose: icon.shape === "maskable" ? "maskable" : "any",
    })),
  };
}
