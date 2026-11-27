// Every save shows its result within 400 ms (the Doherty threshold), even
// when the server takes much longer. The tests slow every save down to
// SLOW_MS on purpose, then time from the tap to the result on screen.
// Also: when a save fails, the change goes back and you're told why, and
// the edit sheet grows out of the row you tapped.

import { expect, test, type Page } from "@playwright/test";
import { literal, loginWithDemo, resetDemo, topCard } from "./helpers/demo";

/** How long each save takes on the slowed-down server. */
const SLOW_MS = 1500;
/** The Doherty threshold: an answer under this feels instant. */
const INSTANT_MS = 400;

/** Server actions are POSTs with a Next-Action header. */
function isSave(method: string, headers: Record<string, string>) {
  return method === "POST" && "next-action" in headers;
}

/** Every save waits SLOW_MS before it reaches the server. */
async function slowSaves(page: Page) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (!isSave(request.method(), request.headers())) return route.fallback();
    await new Promise((resolve) => setTimeout(resolve, SLOW_MS));
    await route.fallback();
  });
}

/**
 * Milliseconds from the next tap anywhere to `done` (a script checked
 * every frame) coming true. `act` does the tap.
 */
async function timeTo(page: Page, act: () => Promise<void>, done: string): Promise<number> {
  await page.evaluate(() => {
    const w = window as unknown as { tapAt: number | null };
    w.tapAt = null;
    const arm = () => {
      w.tapAt ??= performance.now();
    };
    document.addEventListener("pointerdown", arm, { capture: true, once: true });
    document.addEventListener("click", arm, { capture: true, once: true });
  });
  await act();
  const handle = await page.waitForFunction(
    (check) => {
      const w = window as unknown as { tapAt: number | null };
      const ok = new Function(`return (${check})`)() as boolean;
      return ok && w.tapAt !== null ? performance.now() - w.tapAt : null;
    },
    done,
    { polling: "raf", timeout: 10_000 },
  );
  return (await handle.jsonValue()) as number;
}

/** A script: is there a row in this meal whose text matches `pattern`? */
function rowShows(meal: string, pattern: string) {
  return `[...document.querySelectorAll('section[aria-labelledby="meal-${meal}"] [data-entry-open]')].some((b) => /${pattern}/.test(b.textContent))`;
}
const noOpenSheet = `!document.querySelector("dialog[open]")`;

test.beforeEach(async ({ page }) => {
  await loginWithDemo(page);
  await resetDemo(page);
});

test("log, edit and delete show at once, and the server's copy changes nothing", async ({ page }) => {
  await slowSaves(page);
  const dinner = page.getByRole("region", { name: "Dinner" });
  const rows = dinner.getByRole("button", { name: /^Tuna rice/ });

  // Log it.
  await dinner.getByRole("button", { name: "Add to dinner" }).click();
  const add = page.getByRole("dialog", { name: "Add to dinner" });
  await add.getByRole("button", { name: /^Tuna rice/ }).click();
  await add.getByRole("textbox", { name: "Servings" }).fill("1.5");
  const logged = await timeTo(page, () => add.getByRole("button", { name: "Log it" }).click(), rowShows("dinner", "Tuna rice"));
  expect(logged).toBeLessThan(INSTANT_MS);
  await expect(add).toBeHidden();
  // The rings counted it too.
  await expect(page.getByText("68 g", { exact: true }).or(page.getByText(/kcal left|kcal over/)).first()).toBeVisible();
  // Once the server's answer is in, it's still one row with the same numbers.
  await page.waitForTimeout(SLOW_MS + 1000);
  await expect(rows).toHaveCount(1);
  await expect(rows).toHaveAccessibleName("Tuna rice 1.5 servings · 68 g protein 776 kcal");

  // Edit: 1.5 → 2 servings.
  await rows.click();
  const edit = page.getByRole("dialog", { name: "Edit entry" });
  await edit.getByRole("textbox", { name: "Servings" }).fill("2");
  const edited = await timeTo(
    page,
    () => edit.getByRole("button", { name: "Save changes" }).click(),
    rowShows("dinner", "Tuna rice.*2 servings"),
  );
  expect(edited).toBeLessThan(INSTANT_MS);
  await page.waitForTimeout(SLOW_MS + 1000);
  await expect(rows).toHaveAccessibleName(/^Tuna rice 2 servings/);

  // Delete from the sheet: the sheet closes at once and the row goes.
  await rows.click();
  await edit.getByRole("button", { name: "Delete", exact: true }).click();
  const deleted = await timeTo(page, () => edit.getByRole("button", { name: "Yes, delete" }).click(), noOpenSheet);
  expect(deleted).toBeLessThan(INSTANT_MS);
  await expect(rows).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible({ timeout: SLOW_MS + 5000 });
});

test("swap and its Undo show at once", async ({ page }) => {
  await slowSaves(page);
  const lunch = page.getByRole("region", { name: "Lunch" });
  await lunch.getByRole("button", { name: "Tired of Chicken rice bowl? Swap it" }).click();
  const sheet = page.getByRole("dialog", { name: "Instead of Chicken rice bowl" });
  await expect(sheet.getByText("1 of 4", { exact: true })).toBeVisible();
  const best = await topCard(sheet);

  const swapped = await timeTo(
    page,
    () => sheet.getByRole("button", { name: /^Swap to this: / }).click(),
    `${noOpenSheet} && ${rowShows("lunch", literal(best).replace(/\//g, "\\/"))}`,
  );
  expect(swapped).toBeLessThan(INSTANT_MS);
  // Undo is offered straight away, not after the server answers.
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible({ timeout: INSTANT_MS });

  const undone = await timeTo(
    page,
    () => page.getByRole("button", { name: "Undo" }).click(),
    `${rowShows("lunch", "Chicken rice bowl")} && !${rowShows("lunch", literal(best).replace(/\//g, "\\/"))}`,
  );
  expect(undone).toBeLessThan(INSTANT_MS);
  // Both saves done: still Chicken rice bowl, and no error message.
  await page.waitForTimeout(2 * SLOW_MS + 1500);
  await expect(lunch.getByRole("button", { name: /^Chicken rice bowl 1 serving/ })).toBeVisible();
  await expect(page.getByText(/Couldn't/)).toHaveCount(0);
});

test("a log that can't reach the server goes back, and its sheet opens again with what you typed", async ({ page }) => {
  const dinner = page.getByRole("region", { name: "Dinner" });
  await dinner.getByRole("button", { name: "Add to dinner" }).click();
  const add = page.getByRole("dialog", { name: "Add to dinner" });
  await add.getByRole("button", { name: /^Tuna rice/ }).click();
  await add.getByRole("textbox", { name: "Servings" }).fill("1.5");

  // The connection drops on the way to the server, a moment after the tap.
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (!isSave(request.method(), request.headers())) return route.fallback();
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.abort("connectionreset");
  });
  await add.getByRole("button", { name: "Log it" }).click();
  // Shown at once...
  await expect(dinner.getByRole("button", { name: /^Tuna rice/ })).toBeVisible({ timeout: INSTANT_MS });
  // ...then back out, and the sheet is back with 1.5 and the reason.
  await expect(add).toBeVisible({ timeout: 5000 });
  await expect(add.getByRole("textbox", { name: "Servings" })).toHaveValue("1.5");
  await expect(add.getByText(/The connection dropped/)).toBeVisible();
  await expect(dinner.getByRole("button", { name: /^Tuna rice/ })).toHaveCount(0);
});

test("offline, a log fails at once and its sheet comes back with the reason", async ({ page, context }) => {
  const dinner = page.getByRole("region", { name: "Dinner" });
  await dinner.getByRole("button", { name: "Add to dinner" }).click();
  const add = page.getByRole("dialog", { name: "Add to dinner" });
  await add.getByRole("button", { name: /^Tuna rice/ }).click();
  await add.getByRole("textbox", { name: "Servings" }).fill("2");
  // Fails in the phone straight away, while the sheet is still sliding
  // away: the reopened sheet must still be built afresh with the reason.
  await context.setOffline(true);
  await add.getByRole("button", { name: "Log it" }).click();
  await expect(add.getByText(/no connection/)).toBeVisible({ timeout: 5000 });
  await expect(add.getByRole("textbox", { name: "Servings" })).toHaveValue("2");
  await expect(dinner.getByRole("button", { name: /^Tuna rice/ })).toHaveCount(0);
  await context.setOffline(false);
  // Trying again works, once.
  await add.getByRole("button", { name: "Log it" }).click();
  await expect(add).toBeHidden();
  await page.waitForTimeout(2000);
  await expect(dinner.getByRole("button", { name: /^Tuna rice/ })).toHaveCount(1);
});

test("Settings shows Saved at once", async ({ page }) => {
  await page.goto("/settings");
  await slowSaves(page);
  await page.getByRole("textbox", { name: "Protein" }).fill("141");
  const saved = await timeTo(
    page,
    () => page.getByRole("button", { name: "Save targets" }).click(),
    `[...document.querySelectorAll('[role="status"]')].some((s) => s.textContent.trim() === "Saved")`,
  );
  expect(saved).toBeLessThan(INSTANT_MS);
});

test("the edit sheet grows out of the row you tapped", async ({ page }) => {
  const lunch = page.getByRole("region", { name: "Lunch" });
  const row = lunch.locator("[data-entry-row]").first();
  const rowId = await row.getAttribute("data-entry-row");
  // The sheet's panel and the row, read in the first frame the sheet is
  // painted (the tap may scroll the row first, so not measured before).
  const firstFrame = page.evaluate(
    (id) =>
      new Promise<{ top: number; height: number; rowTop: number; rowHeight: number }>((resolve) => {
        const look = () => {
          const panel = document.querySelector("dialog[open] > div");
          const row = document.querySelector(`[data-entry-row="${id}"]`);
          if (!panel || !row) return requestAnimationFrame(look);
          const box = panel.getBoundingClientRect();
          const rowBox = row.getBoundingClientRect();
          resolve({ top: box.top, height: box.height, rowTop: rowBox.top, rowHeight: rowBox.height });
        };
        requestAnimationFrame(look);
      }),
    rowId,
  );
  await row.locator("[data-entry-open]").click();
  const start = await firstFrame;
  // It starts where the row is, about the row's height, not at the bottom
  // (a frame or two into the grow by the time it's read).
  expect(Math.abs(start.top - start.rowTop)).toBeLessThan(40);
  expect(start.height).toBeLessThan(start.rowHeight * 3);
  // And ends as a normal sheet.
  const sheet = page.getByRole("dialog", { name: "Edit entry" });
  await expect(sheet.getByRole("button", { name: "Save changes" })).toBeVisible();
});
