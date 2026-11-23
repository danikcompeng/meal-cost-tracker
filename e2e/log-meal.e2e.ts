// Log a meal: add a recipe to dinner at 1.5 servings, and the row shows
// 1.5 x the recipe's per-serving numbers.

import { expect, test } from "@playwright/test";
import { loginWithDemo, resetDemo } from "./helpers/demo";

test.beforeEach(async ({ page }) => {
  await loginWithDemo(page);
  await resetDemo(page);
});

test("log 1.5 servings of a recipe to dinner", async ({ page }) => {
  const dinner = page.getByRole("region", { name: "Dinner" });
  // The sample day has no dinner yet.
  await expect(dinner.getByRole("listitem")).toHaveCount(0);

  await page.getByRole("button", { name: "Add to dinner" }).click();
  const sheet = page.getByRole("dialog", { name: "Add to dinner" });
  await sheet.getByRole("button", { name: /^Tuna rice/ }).click();

  const servings = sheet.getByRole("textbox", { name: "Servings" });
  await servings.fill("1.5");
  // The preview under the box follows what you typed.
  await expect(sheet.getByText(/^= 776 kcal · 68 g protein · \$3\.02$/)).toBeVisible();
  await sheet.getByRole("button", { name: "Log it" }).click();
  await expect(sheet).toBeHidden();

  // Tuna rice per serving (2 servings: 284 g tuna, 180 g rice, 170 g
  // broccoli) is 517.6 kcal and 45.6 g protein, so 1.5 servings is
  // 776.4 kcal and 68.4 g protein, shown rounded. Cost: tuna 284/142 x
  // $1.29 + rice 180 x $0.00249 + broccoli 170/340 x $1.99 = $4.023 per
  // recipe, $2.012 per serving, so 1.5 servings = $3.02 (the preview).
  const row = dinner.getByRole("button", { name: /^Tuna rice/ });
  await expect(row).toHaveAccessibleName("Tuna rice 1.5 servings · 68 g protein 776 kcal");
});
