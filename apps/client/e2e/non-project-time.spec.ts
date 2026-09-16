import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsMember } from "./helpers/auth";

test.describe("non-project time", () => {
  test("timesheet dialog offers organization time types", async ({ page }) => {
    await loginAsMember(page);
    await page.goto("/timesheet");
    await expect(page).toHaveURL(/\/timesheet$/);
    await expect(page.getByRole("button", { name: "week", exact: true })).toBeVisible({
      timeout: 30_000
    });
    await page.getByRole("button", { name: "day", exact: true }).click();
    // Seeded weekdays fill 09:00–18:15. An evening slot stays empty, and force
    // click avoids the sticky day header intercepting Playwright's scroll-into-view.
    const emptySlot = page.getByRole("button", { name: /^(7:30 PM|19:30)$/ });
    await emptySlot.click({ force: true, timeout: 15_000 });
    await expect(page.getByTestId("entry-type-alt-link")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("entry-type-alt-link").click();
    await expect(page.getByRole("combobox", { name: "Activity" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Full" })).toHaveCount(0);
    await page.getByRole("combobox", { name: "Activity" }).click();
    await expect(page.getByRole("option", { name: /Office Event/ })).toBeVisible();
    await expect(page.getByLabel("Start time")).toBeVisible();
    await expect(page.getByLabel("End time")).toBeVisible();
    await expect(page.getByLabel("Duration")).toBeVisible();
  });

  test("organization page shows holiday and activity catalogs", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/account/organization");
    await expect(page.getByTestId("org-holiday-calendar")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("org-activity-types")).toBeVisible();
    await expect(page.getByTestId("org-activity-type-office_event")).toBeVisible();
    await expect(page.getByTestId("org-activity-children-office_event")).toBeVisible();
    await expect(page.getByTestId("org-activity-edit-office_event")).toBeVisible();
  });

  test("exports expose a non-project time filter", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/exports");
    await page.getByRole("button", { name: "Custom export" }).click();
    await expect(page.getByTestId("non-project-time-filter")).toBeVisible({ timeout: 15_000 });
  });

  test("management dashboard defaults to excluding non-project time", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard");
    await expect(page.getByTestId("dashboard-filters-toolbar")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /scope filters/i }).click();
    await expect(page.getByTestId("non-project-time-filter")).toBeVisible();
    await expect(page.getByTestId("non-project-time-filter")).toContainText(/exclude/i);
    await page.getByRole("combobox", { name: "Non-project time" }).click();
    await expect(page.getByRole("option", { name: "Include" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Exclude" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Only non-project" })).toBeVisible();
  });

  test("personal overview exposes a non-project time filter", async ({ page }) => {
    await loginAsMember(page);
    await page.goto("/overview");
    await expect(page.getByTestId("dashboard-filters-toolbar")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /scope filters/i }).click();
    await expect(page.getByTestId("non-project-time-filter")).toBeVisible();
    await expect(page.getByTestId("non-project-time-filter")).toContainText(/include/i);
    await page.getByRole("combobox", { name: "Non-project time" }).click();
    await expect(page.getByRole("option", { name: "Include" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Exclude" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Only non-project" })).toBeVisible();
  });
});
