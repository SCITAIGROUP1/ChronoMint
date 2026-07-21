import { expect, test } from "@playwright/test";

test.describe("UPS-05B unified work routes", () => {
  test("supports direct refresh for projects, tasks, and time tracker", async ({ page }) => {
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole("heading", { name: /projects/i })).toBeVisible();

    await page.goto("/tasks");
    await expect(page).toHaveURL(/\/tasks$/);
    await expect(page.getByRole("heading", { name: "Tasks", exact: true })).toBeVisible();

    await page.goto("/time-tracker");
    await expect(page).toHaveURL(/\/time-tracker$/);
    await expect(
      page.getByRole("heading", { name: /time tracker|timesheet/i }).first()
    ).toBeVisible();
  });
});
