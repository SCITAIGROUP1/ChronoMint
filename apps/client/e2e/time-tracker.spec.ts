import { test, expect } from "@playwright/test";
import { dismissOnboardingIfVisible } from "./helpers/onboarding";

test.describe("Time Tracker", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/time-tracker");
    await dismissOnboardingIfVisible(page);
    await expect(page.getByRole("heading", { name: "Time Tracker", exact: true })).toBeVisible();
  });

  test("shows stat cards, filters, and week-grouped list shell", async ({ page }) => {
    await expect(page.getByText("This Week", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Billable", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Pending Approval", { exact: true })).toBeVisible();
    await expect(page.getByText("Entries", { exact: true }).first()).toBeVisible();
    await expect(page.getByPlaceholder("Search entries...")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Entry" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Date range" })).toBeVisible();
  });

  test("shows export and import actions", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Import" })).toBeVisible();
  });

  test("opens export modal with period defaults", async ({ page }) => {
    await page.getByRole("button", { name: "Export" }).click();
    await expect(page.getByRole("heading", { name: "Export my time" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export date range" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download" })).toBeVisible();
    await expect(page.getByText("Report", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Category", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Export date range" }).click();
    await expect(page.getByRole("group", { name: "Export date range" })).toBeVisible();
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByRole("group", { name: "Export date range" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Export date range" })).toBeVisible();
  });

  test("opens import modal with template control", async ({ page }) => {
    await page.getByRole("button", { name: "Import" }).click();
    await expect(page.getByRole("heading", { name: "Import time entries" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Template" })).toBeVisible();
    await expect(page.getByText(/Click or drag CSV \/ Excel here/i)).toBeVisible();
  });

  test("supports custom date range selection while keeping week sections", async ({ page }) => {
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
    const d1 = `${currentYear}-${currentMonth}-01`;
    const d2 = `${currentYear}-${currentMonth}-14`;

    await page.getByRole("button", { name: "Date range" }).click();
    await page.getByRole("button", { name: d1 }).click();
    await page.getByRole("button", { name: d2 }).click();
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByRole("combobox", { name: "Time period" })).toContainText("Custom range");
    await expect(page.getByText(/Week of/i).first()).toBeVisible();
    await expect(page.getByText(/Week 1 of/i)).toBeVisible();
  });

  test("opens add entry dialog", async ({ page }) => {
    await page.getByRole("button", { name: "Add Entry" }).click();
    await expect(page.getByRole("heading", { name: "Add time entry" })).toBeVisible();
    await expect(page.getByText("When", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Entry date" })).toBeVisible();
  });

  test("expands filters panel with category and task controls", async ({ page }) => {
    await page.getByRole("button", { name: /Filters/i }).click();
    await expect(page.getByLabel("Category")).toBeVisible();
    await expect(page.getByLabel("Task")).toBeVisible();
  });
});
