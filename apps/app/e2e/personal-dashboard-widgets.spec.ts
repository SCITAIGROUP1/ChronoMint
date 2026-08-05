import { expect, test } from "@playwright/test";
import { loginAsMember } from "./helpers/auth";

test.describe("restored personal dashboard widgets", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await loginAsMember(page);
    // Personal widgets live on Overview (My time), not the management Dashboard.
    await page.goto("/overview");
    await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible({
      timeout: 30_000
    });
  });

  test("shows the restored personal widgets without horizontal overflow", async ({ page }) => {
    for (const name of [
      "My Weekly Progress",
      "My Project Distribution",
      "My Quick Timer",
      "My Category Split",
      "My Today’s Logs"
    ]) {
      await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 15_000 });
    }

    await page.setViewportSize({ width: 375, height: 812 });
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasOverflow).toBe(false);
  });
});
