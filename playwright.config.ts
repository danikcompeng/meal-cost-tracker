// End-to-end tests: a real browser, shaped like an iPhone, using the live
// app through "Try the demo". Run them with `npm run test:e2e`.
//
// The demo account is shared, so the tests run one at a time (workers: 1):
// two at once would reset each other's data halfway through.
//
// The demo recording has its own config (e2e/record.config.ts), so
// `npm run test:e2e` never records a video.

import { defineConfig } from "@playwright/test";
import { BASE_URL, PHONE } from "./e2e/helpers/phone";

export default defineConfig({
  testDir: "./e2e",
  // *.e2e.ts, not *.spec.ts: Vitest (npm test) picks up every *.spec.ts
  // and *.test.ts, and these need Playwright's runner instead.
  testMatch: "**/*.e2e.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  // The live app and Supabase are over the internet: a little slack.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    ...PHONE,
    baseURL: BASE_URL,
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
