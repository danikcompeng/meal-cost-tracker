// Swiping swap cards with a finger (real touch events, e2e/helpers/finger.ts).
// Guards the phone-test bug of 2026-11-23: after a swipe-skip, the next
// card was drawn where the skipped one had flown to (far off to the left),
// so the stack looked empty. The buttons never showed it, so the other
// swap test (swap-meal.e2e.ts) couldn't catch it.

import { expect, test, type Locator, type Page } from "@playwright/test";
import { literal, loginWithDemo, resetDemo, topCard } from "./helpers/demo";
import { Finger } from "./helpers/finger";

test.beforeEach(async ({ page }) => {
  await loginWithDemo(page);
  await resetDemo(page);
});

/** The top card: on screen, its name showing, and it's the card the buttons name. */
async function expectTopCardShowing(sheet: Locator) {
  const card = sheet.locator("article").first();
  await expect(card).toBeInViewport({ ratio: 0.9 });
  const name = await topCard(sheet);
  await expect(card.getByRole("heading", { name, exact: true })).toBeVisible();
  return name;
}

async function openLunchSwap(page: Page) {
  const lunch = page.getByRole("region", { name: "Lunch" });
  await lunch.getByRole("button", { name: /^Tired of .*\? Swap it$/ }).click();
  const sheet = page.getByRole("dialog", { name: /^Instead of / });
  await expect(sheet.getByText("1 of 4", { exact: true })).toBeVisible();
  return { lunch, sheet };
}

test("swipe left skips, and the next card shows in place", async ({ page }) => {
  const { sheet } = await openLunchSwap(page);
  const first = await expectTopCardShowing(sheet);

  const finger = await Finger.on(page);
  await finger.swipeAcross(sheet.locator("article").first(), -160);

  await expect(sheet.getByText("2 of 4", { exact: true })).toBeVisible();
  const second = await expectTopCardShowing(sheet);
  expect(second).not.toBe(first);

  // And once more, so it isn't only the first hand-over.
  await finger.swipeAcross(sheet.locator("article").first(), -160);
  await expect(sheet.getByText("3 of 4", { exact: true })).toBeVisible();
  await expectTopCardShowing(sheet);
});

test("swipe right swaps, and the next swap sheet's card shows in place", async ({ page }) => {
  const { lunch, sheet } = await openLunchSwap(page);
  const best = await expectTopCardShowing(sheet);

  const finger = await Finger.on(page);
  await finger.swipeAcross(sheet.locator("article").first(), 160);

  await expect(sheet).toBeHidden();
  await expect(lunch.getByRole("button", { name: new RegExp(`^${literal(best)} 1 serving`) })).toBeVisible();

  // Tired of the new one too: its stack starts with a card in place.
  const again = await openLunchSwap(page);
  await expectTopCardShowing(again.sheet);
});
