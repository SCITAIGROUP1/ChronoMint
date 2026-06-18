import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("exports quick flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("shows scenario picker and quick reports mode", async ({ page }) => {
    await page.goto("/exports");
    await expect(page.getByRole("heading", { name: "Exports" })).toBeVisible();
    await expect(page.getByText("Quick reports")).toBeVisible();
    await expect(page.getByText("Payroll & timesheets")).toBeVisible();
    await expect(page.getByText("Team summary")).toBeVisible();
  });

  test("dashboard export period link opens exports with dates", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Export period" }).click();
    await expect(page).toHaveURL(/\/exports\?from=/);
    await expect(page.getByText("Payroll & timesheets")).toBeVisible();
  });
});
