// The demo video recording (e2e/record-demo.ts), kept apart from the
// tests so `npm run test:e2e` never records. Run it with
// `npm run record:demo`.

import { defineConfig } from "@playwright/test";
import { BASE_URL, PHONE } from "./helpers/phone";

export default defineConfig({
  testDir: ".",
  testMatch: "record-demo.ts",
  // One take at a time: both use the shared demo account.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // A take is about 90 s of acting plus encoding.
  timeout: 6 * 60_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  outputDir: "../test-results/record",
  use: {
    ...PHONE,
    baseURL: BASE_URL,
    browserName: "chromium",
  },
});
