import { test, expect } from "@playwright/test";
import { dismissOnboardingIfVisible } from "./helpers/onboarding";

test.describe("Timesheet calendar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/timesheet");
    await dismissOnboardingIfVisible(page);
    await expect(page).toHaveURL(/\/timesheet/);
    await expect(page.getByRole("button", { name: "week", exact: true })).toBeVisible();
  });

  test("shows mobile Time Tracker tip on a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.addInitScript(() => {
      sessionStorage.removeItem("kloqra-timesheet-mobile-banner-dismissed");
    });
    await page.goto("/timesheet");
    await expect(page.getByText(/easier for viewing and editing entries/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Open" })).toBeVisible();
  });

  test("week view scrolls horizontally instead of overflowing the page", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.getByRole("button", { name: "week", exact: true }).click();

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 1;
    });
    expect(overflow).toBe(false);
  });
});

test.describe("Timesheet export (GH-199)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/timesheet");
    await dismissOnboardingIfVisible(page);
    await expect(page.getByRole("heading", { name: /export my timesheet/i })).toBeVisible({
      timeout: 15_000
    });
  });

  test("AC-1: member exports CSV for visible range", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export", exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
    const path = await download.path();
    expect(path).toBeTruthy();
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(path!, "utf8");
    expect(content.length).toBeGreaterThan(0);
    expect(content.toLowerCase()).toMatch(/date|project|task|duration/);
  });

  test("AC-2: empty date range shows no-entries toast", async ({ page }) => {
    await page.locator("#export-from").fill("2099-01-01");
    await page.locator("#export-to").fill("2099-01-07");
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await expect(page.getByText(/no entries to export/i)).toBeVisible({ timeout: 10_000 });
  });
});
