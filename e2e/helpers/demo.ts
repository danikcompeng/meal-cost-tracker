// Logging in and resetting, always as the shared demo account.
//
// Only ever "Try the demo": the tests and the recording never type an
// email, so no personal account or data can appear in them. The demo is
// shared with everyone, so every test resets it first (and the suite
// resets it once more at the end, so the next visitor finds it clean).
//
// A failure right after someone else used the demo (they logged a meal
// or added a recipe between our reset and our check), or just after
// midnight (the sample day is "today"), isn't a bug: run it again first.
// Likewise, don't run `test:e2e` and `record:demo` at the same time.

import { expect, type Locator, type Page } from "@playwright/test";

/** `text` as a literal piece of a regular expression ("Rice (big)" stays as typed). */
export function literal(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The swap sheet's top card: its recipe name, read off its "Swap to this: …" button. */
export async function topCard(sheet: Locator): Promise<string> {
  const label = await sheet.getByRole("button", { name: /^Swap to this: / }).getAttribute("aria-label");
  if (!label) throw new Error("The Swap to this button has no aria-label");
  return label.replace("Swap to this: ", "");
}

/** Login page → "Try the demo" → Today. */
export async function loginWithDemo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Try the demo" }).click();
  await expectToday(page);
}

/**
 * Settings → Reset demo → Yes, reset: the sample foods, recipes and meals,
 * fresh, dated today. The app goes back to Today by itself.
 */
export async function resetDemo(page: Page) {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.getByRole("button", { name: "Yes, reset" }).click();
  await page.waitForURL((url) => url.pathname === "/");
  await expectToday(page);
}

/** Today's page, with its meals showing. */
export async function expectToday(page: Page) {
  await expect(page.getByRole("heading", { name: "Today", level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Lunch" })).toBeVisible();
}
