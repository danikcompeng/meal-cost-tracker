// After the last test: one more reset, so whoever taps "Try the demo"
// next finds the sample data, not what the tests logged.

import { chromium } from "@playwright/test";
import { loginWithDemo, resetDemo } from "./helpers/demo";
import { BASE_URL, PHONE } from "./helpers/phone";

export default async function globalTeardown() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ ...PHONE, baseURL: BASE_URL });
    await loginWithDemo(page);
    await resetDemo(page);
  } finally {
    await browser.close();
  }
}
