import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { dismissOnboardingIfVisible } from "./helpers/onboarding";

const OUT = path.resolve(process.cwd(), "../../.qa-evidence/GH-199/screenshots");

test.describe("Evidence capture GH-199", () => {
  test.beforeAll(() => {
    fs.mkdirSync(OUT, { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/timesheet");
    await dismissOnboardingIfVisible(page);
    await expect(page.getByRole("heading", { name: /export my timesheet/i })).toBeVisible({
      timeout: 15_000
    });
  });

  test("GH-199-AC-1 export UI and CSV", async ({ page }) => {
    await page.screenshot({ path: path.join(OUT, "GH-199-AC-1-export-ui.png") });
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export", exact: true }).click();
    const download = await downloadPromise;
    await download.saveAs(path.join(OUT, "GH-199-AC-1-export-download.csv"));
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });

  test("GH-199-AC-2 empty range toast", async ({ page }) => {
    await page.locator("#export-from").fill("2099-01-01");
    await page.locator("#export-to").fill("2099-01-07");
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await expect(page.getByText(/no entries to export/i)).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: path.join(OUT, "GH-199-AC-2-empty-toast.png") });
  });
});

test.describe("Evidence capture GH-199 AC-3", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("GH-199-AC-3 login redirect", async ({ page }) => {
    await page.goto("/timesheet");
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await page.screenshot({ path: path.join(OUT, "GH-199-AC-3-login-redirect.png") });
  });
});
