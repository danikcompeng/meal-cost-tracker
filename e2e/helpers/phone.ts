// The phone every e2e test and the demo recording runs on: an iPhone 15's
// screen (393 x 852 CSS pixels, the whole screen, as when Bitewise is
// installed to the home screen), with touch, drawn at 2x.
//
// Playwright's own "iPhone 15" preset is 393 x 659: the space Safari leaves
// under its address bar. We use the full screen instead, because the app
// is meant to be installed and a video in the real phone shape looks right.

import { devices, type BrowserContextOptions } from "@playwright/test";

export const PHONE = {
  userAgent: devices["iPhone 15"].userAgent,
  viewport: { width: 393, height: 852 },
  screen: { width: 393, height: 852 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
} satisfies BrowserContextOptions;

/** The live app. Set BASE_URL to test another copy (say, http://localhost:3000). */
export const BASE_URL = process.env.BASE_URL ?? "https://stapleapp.vercel.app";
