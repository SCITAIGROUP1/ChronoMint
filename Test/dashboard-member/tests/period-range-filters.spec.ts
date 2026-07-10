import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { DashboardPage } from "../pages/dashboard.page";

// Group 3: Period & Range filters (AC-6, AC-7, AC-8) + Group 4: Scope filters (AC-10–AC-13)
// Source: specs_qa/dashboard-member.md DM-007, DM-009, DM-010, DM-012–DM-015
//
// NOTE: DM-008 ("Today" period duplicate KPI label) and DM-011 (custom-range clamping,
// the major new finding) are deliberately NOT in this file — they are genuine defect
// regressions and live in tests/defect-regressions.spec.ts so they stay clearly
// separated from the "this behaves as expected" scenarios below.

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";

test.describe("Period & Range filters", () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, "TEST_USER_EMAIL / TEST_USER_PASSWORD not configured in .env");

  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(TEST_EMAIL, TEST_PASSWORD);
    await new DashboardPage(page).ensureTimerStopped();
  });

  // DM-007 — Default period is "This week"
  test("Default period is This week with a matching Range span", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    expect(await dashboard.isPeriodActive(dashboard.thisWeekButton)).toBe(true);
    expect(await dashboard.isPeriodActive(dashboard.todayButton)).toBe(false);
    expect(await dashboard.isPeriodActive(dashboard.thisMonthButton)).toBe(false);
    const rangeText = await dashboard.getRangeText();
    expect(rangeText).toMatch(/\d{4}/);
  });

  // DM-009 — Switching to "This month" relabels the Week KPI card + chart heading
  test("Switching to This month relabels the Week KPI card to Period", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.selectPeriod("This month");
    await expect(dashboard.totalHoursWeekOrPeriodHeading()).toHaveText("Total Hours (Period)");
    await expect(dashboard.weeklyProgressChartHeading()).toHaveText(/Progress Chart/);
  });

  // DM-010 — Custom date range deselects period presets
  test("Picking a custom range deselects the Period presets", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth(), Math.min(today.getDate() + 2, 27));
    await dashboard.pickCustomDateRange(from, to);

    for (const button of [dashboard.todayButton, dashboard.thisWeekButton, dashboard.thisMonthButton]) {
      expect(await dashboard.isPeriodActive(button), "no period preset should remain active").toBe(false);
    }
  });
});

test.describe("Scope filters", () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, "TEST_USER_EMAIL / TEST_USER_PASSWORD not configured in .env");

  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(TEST_EMAIL, TEST_PASSWORD);
    await new DashboardPage(page).ensureTimerStopped();
  });

  // DM-012 — Scope filters collapsed by default with helper text
  test("Scope filters section is collapsed by default with helper text", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.scopeFiltersToggle).toBeVisible();
    await expect(dashboard.scopeFiltersHelperText).toBeVisible();
    await expect(dashboard.projectFilterCombobox).not.toBeVisible();
  });

  // DM-013 — Scope filters expose only Project, Category, Task — no Member filter
  test("Expanding scope filters shows exactly Project, Category, Task (no Member filter)", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.expandScopeFilters();
    await expect(dashboard.projectFilterCombobox).toBeVisible();
    await expect(dashboard.projectFilterCombobox).toHaveText("All projects");
    await expect(dashboard.categoryFilterCombobox).toBeVisible();
    await expect(dashboard.categoryFilterCombobox).toHaveText("All categories");
    await expect(dashboard.taskFilterPlaceholderText).toBeVisible();
    await expect(page.getByRole("combobox", { name: /member/i })).toHaveCount(0);
  });

  // DM-014 — Selecting a project enables the Task filter
  test("Selecting a project enables the Task filter combobox", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.expandScopeFilters();
    await dashboard.selectScopeProject("Aimswebplus");
    await expect(dashboard.taskFilterCombobox).toBeVisible();
    await expect(dashboard.taskFilterCombobox).toHaveText("All tasks");
  });

  // DM-015 — Clearing scope filters resets all three to defaults
  test("Clear all resets Project, Category, and Task to defaults", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.expandScopeFilters();
    await dashboard.selectScopeProject("Aimswebplus");
    await expect(dashboard.taskFilterCombobox).toBeVisible();

    await dashboard.clearScopeFilters();

    await expect(dashboard.projectFilterCombobox).toHaveText("All projects");
    await expect(dashboard.categoryFilterCombobox).toHaveText("All categories");
    await expect(dashboard.taskFilterPlaceholderText).toBeVisible();
  });
});
