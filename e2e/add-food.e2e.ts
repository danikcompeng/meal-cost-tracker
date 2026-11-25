// Add a food: Foods opens on your list, "New food" opens the form with
// "What you paid" right after the unit, and saving closes it again with
// the new food in the list. Cancel closes it without saving.

import { expect, test } from "@playwright/test";
import { loginWithDemo, resetDemo } from "./helpers/demo";

test.beforeEach(async ({ page }) => {
  await loginWithDemo(page);
  await resetDemo(page);
});

test("Foods opens on the list; New food adds one and closes", async ({ page }) => {
  await page.getByRole("link", { name: "Kitchen" }).click();
  await page.getByRole("link", { name: "Foods" }).click();

  // The list first: no form until you ask for one.
  const list = page.getByRole("region", { name: "Your foods" });
  await expect(list.getByRole("button", { name: /^Banana/ })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Price" })).toHaveCount(0);

  // Cancel closes it without saving.
  await page.getByRole("button", { name: "New food" }).click();
  await expect(page.getByRole("textbox", { name: "Price" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("textbox", { name: "Price" })).toHaveCount(0);

  await page.getByRole("button", { name: "New food" }).click();
  const name = page.getByRole("textbox", { name: "Name" });
  const price = page.getByRole("textbox", { name: "Price" });
  const calories = page.getByRole("textbox", { name: "Calories" });

  // What you paid comes before the nutrition.
  const priceTop = (await price.boundingBox())!.y;
  const caloriesTop = (await calories.boundingBox())!.y;
  expect(priceTop).toBeLessThan(caloriesTop);

  await name.fill("Peanut butter");
  await price.fill("4.50");
  await page.getByRole("textbox", { name: "Package size" }).fill("500");
  await expect(page.getByText("= $0.90 / 100 g")).toBeVisible();
  await page.getByRole("button", { name: "Add food" }).click();

  // Saved: the form closes and the food is in the list.
  await expect(page.getByRole("textbox", { name: "Price" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New food" })).toBeVisible();
  await expect(list.getByRole("button", { name: /^Peanut butter/ })).toBeVisible();

  // Tapping a food opens it for editing, at the top; Cancel closes it.
  await list.getByRole("button", { name: /^Banana/ }).click();
  await expect(page.getByRole("textbox", { name: "Name" })).toHaveValue("Banana");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("textbox", { name: "Name" })).toHaveCount(0);
});

test("Add it on Foods opens straight on the form", async ({ page }) => {
  await page.goto("/foods?new");
  await expect(page.getByRole("textbox", { name: "Price" })).toBeVisible();
  // It can still be closed, back to the list.
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("button", { name: "New food" })).toBeVisible();
});
