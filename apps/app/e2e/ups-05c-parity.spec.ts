import { expect, test } from "@playwright/test";
import { loginAsMember } from "./helpers/auth";

test.describe("UPS-05C unified member parity", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await loginAsMember(page);
  });

  test("uses unified-shell assistant and onboarding controls", async ({ page }) => {
    await page.goto("/dashboard");
    const skip = page.getByRole("button", { name: "Skip onboarding" });
    await Promise.race([
      skip.waitFor({ state: "visible", timeout: 15_000 }),
      page.getByRole("button", { name: "Help menu" }).waitFor({ state: "visible", timeout: 15_000 })
    ]);
    if (await skip.isVisible().catch(() => false)) {
      await expect(page.getByRole("heading", { name: /Welcome to Kloqra/i })).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Help menu" })).toBeAttached();
    await expect(page.getByRole("button", { name: "Open help assistant" })).toBeAttached();
  });

  test("shows the dedicated personal time tracker presentation", async ({ page }) => {
    await page.goto("/time-tracker");
    await expect(page.getByRole("heading", { name: "Time Tracker", exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("Search entries...")).toBeVisible();
    await expect(page.getByRole("button", { name: "Filters" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Import" })).toBeVisible();
    await page.getByRole("button", { name: "Add Entry" }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Log time" })).toBeVisible();
    await expect(page).toHaveURL(/\/time-tracker$/);
  });

  test("keeps profile, settings, and notifications personal", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/profile$/);

    await page.goto("/settings");
    await expect(page).toHaveURL(/\/settings$/);

    await page.goto("/notifications");
    await expect(page).toHaveURL(/\/notifications$/);
  });
});
