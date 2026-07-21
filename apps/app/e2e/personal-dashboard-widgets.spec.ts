import { expect, test } from "@playwright/test";
import { loginAsMember } from "./helpers/auth";

test.describe("restored personal dashboard widgets", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await loginAsMember(page);
    await page.goto("/dashboard");
  });

  test("shows the restored personal widgets without horizontal overflow", async ({ page }) => {
    for (const name of [
      "My Weekly Progress",
      "My Project Distribution",
      "My Quick Timer",
      "My Category Split",
      "My Today’s Logs"
    ]) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }

    await page.setViewportSize({ width: 375, height: 812 });
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasOverflow).toBe(false);
  });
});
