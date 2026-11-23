// Build a recipe: a new recipe with two of the demo's foods, and its cost
// and nutrients per serving come out as worked by hand.

import { expect, test, type Page } from "@playwright/test";
import { literal, loginWithDemo, resetDemo } from "./helpers/demo";

test.beforeEach(async ({ page }) => {
  await loginWithDemo(page);
  await resetDemo(page);
});

/**
 * In the "Add ingredient" sheet: pick the food, type the amount, Add. The
 * sheet stays open ("Added Black beans · Done") so you can add the next.
 */
async function addIngredient(page: Page, food: string, amount: string) {
  const sheet = page.getByRole("dialog", { name: "Add ingredient" });
  await sheet.getByRole("button", { name: new RegExp(`^${literal(food)}`) }).click();
  await sheet.getByRole("textbox", { name: "Amount" }).fill(amount);
  await sheet.getByRole("button", { name: "Add", exact: true }).click();
  await expect(sheet.getByText(`Added ${food}`)).toBeVisible();
}

test("build a two-ingredient recipe and see its cost per serving", async ({ page }) => {
  await page.getByRole("link", { name: "Kitchen" }).click();
  await page.getByRole("button", { name: "New recipe" }).click();
  const newRecipe = page.getByRole("dialog", { name: "New recipe" });
  await newRecipe.getByRole("textbox", { name: "Name" }).fill("Bean bowl");
  await newRecipe.getByRole("textbox", { name: "Makes" }).fill("2");
  await newRecipe.getByRole("button", { name: "Create" }).click();

  await expect(page.getByRole("heading", { name: "Bean bowl", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Add ingredient" }).click();
  await addIngredient(page, "Black beans", "425");
  await addIngredient(page, "Jasmine rice", "200");
  const ingredientSheet = page.getByRole("dialog", { name: "Add ingredient" });
  await ingredientSheet.getByRole("button", { name: "Done" }).click();
  await expect(ingredientSheet).toBeHidden();

  const ingredients = page.getByRole("region", { name: "Ingredients · 2" });
  await expect(ingredients.getByRole("listitem")).toHaveCount(2);

  // By hand, at the demo's prices:
  //   Black beans  425 g of a 425 g can at $1.19     = $1.19
  //   Jasmine rice 200 g of a 1,000 g bag at $2.49   = $0.498
  //   Whole recipe $1.688, so per serving (2) = $0.844 → $0.84
  // Calories: 425 x 0.91 + 200 x 3.6 = 1,106.75 → 553 kcal per serving.
  // Protein:  425 x 0.06 + 200 x 0.07 = 39.5 g   → 20 g per serving.
  const cost = page.getByRole("region", { name: "Cost per serving" });
  await expect(cost.getByText("$0.84", { exact: true })).toBeVisible();
  await expect(cost.getByText("Makes 2 servings · $1.69 in total")).toBeVisible();

  const perServing = page.getByRole("region", { name: "Per serving", exact: true });
  await expect(perServing.getByRole("definition").first()).toHaveText("553 kcal");
  await expect(perServing.getByRole("definition").nth(1)).toHaveText("20 g");
});
