// Swap a meal: "I'm tired of this" on lunch, swap to the top card, and
// lunch is now that recipe at the same servings. Undo puts it back.

import { expect, test } from "@playwright/test";
import { literal, loginWithDemo, resetDemo, topCard } from "./helpers/demo";

test.beforeEach(async ({ page }) => {
  await loginWithDemo(page);
  await resetDemo(page);
});

test("swap lunch to the best match, then undo", async ({ page }) => {
  const lunch = page.getByRole("region", { name: "Lunch" });
  await expect(lunch.getByRole("button", { name: /^Chicken rice bowl 1 serving/ })).toBeVisible();

  await lunch.getByRole("button", { name: "Tired of Chicken rice bowl? Swap it" }).click();
  const sheet = page.getByRole("dialog", { name: "Instead of Chicken rice bowl" });
  await expect(sheet.getByText("1 of 4", { exact: true })).toBeVisible();

  // Whatever the ranking puts first: read its name off the top card.
  const best = await topCard(sheet);
  expect(best).not.toBe("Chicken rice bowl");

  await sheet.getByRole("button", { name: /^Swap to this: / }).click();
  await expect(sheet).toBeHidden();

  // Servings stay the same when you swap.
  await expect(lunch.getByRole("button", { name: new RegExp(`^${literal(best)} 1 serving`) })).toBeVisible();
  await expect(lunch.getByRole("button", { name: /^Chicken rice bowl/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(lunch.getByRole("button", { name: /^Chicken rice bowl 1 serving/ })).toBeVisible();
  await expect(lunch.getByRole("button", { name: new RegExp(`^${literal(best)}`) })).toHaveCount(0);
});
