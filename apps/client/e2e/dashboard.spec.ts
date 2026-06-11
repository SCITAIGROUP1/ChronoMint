import { test, expect } from "@playwright/test";

test.describe("Client dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  });

  test("shows collapsible scope filters for project, category, and task", async ({ page }) => {
    await page.getByRole("button", { name: /scope filters/i }).click();
    const panel = page.locator("div.grid.gap-4.rounded-lg.border");
    await expect(panel.getByText("Project", { exact: true })).toBeVisible();
    await expect(panel.getByText("Category", { exact: true })).toBeVisible();
    await expect(panel.getByText("Task", { exact: true })).toBeVisible();
  });

  test("renders without horizontal overflow on a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 1;
    });
    expect(overflow).toBe(false);
  });
});
