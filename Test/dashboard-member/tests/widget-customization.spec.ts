import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { DashboardPage } from "../pages/dashboard.page";
import { WidgetCatalogPage } from "../pages/widget-catalog.page";

// Group 6a/6b/6c: Add Widgets / Customize Dashboard panel (AC-23), Toggling widgets
// on/off (AC-24), Reset Layout & Done Editing (AC-25)
// Source: specs_qa/dashboard-member.md DM-044–DM-054
//
// DM-047 (0-match filter category empty-state message) is NOT automated: the exploratory
// session confirmed none of the 4 real filter categories (KPI=4, Time=1, Composition=2,
// Quick=7, summing to all 14) currently yields 0 matches, so the precondition can't be
// reached live — same reason it was "not verified" in Step 3.

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";

test.describe("Add Widgets / Customize Dashboard panel", () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, "TEST_USER_EMAIL / TEST_USER_PASSWORD not configured in .env");

  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(TEST_EMAIL, TEST_PASSWORD);
    await new DashboardPage(page).ensureTimerStopped();
  });

  // DM-044 — Panel opens as a right-side overlay without navigating away
  test("Add Widgets opens Customize Dashboard as an overlay; dashboard stays visible", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const catalog = new WidgetCatalogPage(page);
    await dashboard.goto();

    await dashboard.addWidgetsToggle.click();
    await expect(catalog.panelHeading).toBeVisible();
    await expect(page.getByRole("button", { name: "Close Catalog" })).toBeVisible();
    await expect(dashboard.heading).toBeVisible(); // dashboard still mounted underneath
    await expect(page).toHaveURL(/\/dashboard/); // no navigation occurred

    await catalog.close();
  });

  // DM-045 — Panel lists all 14 widgets with full metadata
  test("Panel lists Available Widgets (14) with Active badges on the 10 default-visible ones", async ({
    page
  }) => {
    const dashboard = new DashboardPage(page);
    const catalog = new WidgetCatalogPage(page);
    await dashboard.goto();
    await dashboard.addWidgetsToggle.click();
    await expect(catalog.panelHeading).toBeVisible();

    expect(await catalog.getAvailableWidgetsCount()).toBe(14);

    const defaultVisible = [
      "Total Hours (Today)",
      "Total Hours (Week)",
      "Active Projects",
      "Weekly Progress Chart",
      "Project Distribution",
      "Category Split",
      "Quick Timer",
      "Daily Progress",
      "Today's Activity Feed",
      "Team Activities"
    ];
    for (const name of defaultVisible) {
      expect(await catalog.isWidgetActive(name), `${name} should show an Active badge`).toBe(true);
    }

    const hidden = ["Billable Hours", "Pinned Favorites", "Recent Activity", "My Timesheets"];
    for (const name of hidden) {
      expect(await catalog.isWidgetActive(name), `${name} should NOT show an Active badge`).toBe(false);
    }

    await catalog.close();
  });

  // DM-046 — Filter pills narrow the widget list correctly (cosmetic-only naming
  // difference from the ticket's "filter tabs" wording — not a gap, functionality works)
  test("[cosmetic naming only, no gap] Filter pills narrow the list, counts sum to 14", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const catalog = new WidgetCatalogPage(page);
    await dashboard.goto();
    await dashboard.addWidgetsToggle.click();
    await expect(catalog.panelHeading).toBeVisible();

    await catalog.filterByCategory("KPI");
    const kpiCount = await catalog.getAvailableWidgetsCount();
    await catalog.filterByCategory("Time");
    const timeCount = await catalog.getAvailableWidgetsCount();
    await catalog.filterByCategory("Composition");
    const compositionCount = await catalog.getAvailableWidgetsCount();
    await catalog.filterByCategory("Quick");
    const quickCount = await catalog.getAvailableWidgetsCount();

    expect(kpiCount + timeCount + compositionCount + quickCount).toBe(14);

    await catalog.filterByCategory("All Widgets");
    expect(await catalog.getAvailableWidgetsCount()).toBe(14);
    await catalog.close();
  });

  // DM-048 — Hidden widgets show no "Inactive" badge: known gap #657, already filed.
  // Documents current, accepted reality (opacity + unchecked switch only) — do not re-file.
  test("[known gap #657] hidden widget rows show no explicit Inactive badge", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const catalog = new WidgetCatalogPage(page);
    await dashboard.goto();
    await dashboard.addWidgetsToggle.click();
    await expect(catalog.panelHeading).toBeVisible();

    const row = catalog.widgetRow("Billable Hours");
    await expect(row.getByText("Inactive", { exact: true })).toHaveCount(0);
    expect(await catalog.isWidgetSwitchOn("Billable Hours")).toBe(false);

    await catalog.close();
  });
});

test.describe("Toggling widgets on/off and Reset Layout", () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, "TEST_USER_EMAIL / TEST_USER_PASSWORD not configured in .env");

  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(TEST_EMAIL, TEST_PASSWORD);
    await new DashboardPage(page).ensureTimerStopped();
  });

  // DM-049 / DM-050 / DM-053 — enabling/disabling a widget updates the grid immediately,
  // remains listed either way, and Reset Layout reverts everything back to the default
  // 10-widget set. Chained into one test (rather than 3) so the account is always left
  // back at its default layout even if an assertion fails partway through.
  test("Toggling a hidden widget on/off updates the grid immediately; Reset Layout restores defaults", async ({
    page
  }) => {
    const dashboard = new DashboardPage(page);
    const catalog = new WidgetCatalogPage(page);
    await dashboard.goto();

    await dashboard.addWidgetsToggle.click();
    await expect(catalog.panelHeading).toBeVisible();

    // DM-049 — enabling "Billable Hours" (hidden by default) shows it on the grid.
    await catalog.toggleWidget("Billable Hours");
    await expect(page.getByRole("heading", { name: "Billable Hours", exact: true })).toBeVisible();

    // DM-050 — disabling a visible widget ("Category Split") removes it from the grid
    // but the widget remains listed (with its switch off) in the catalog for later reuse.
    await catalog.toggleWidget("Category Split");
    await expect(page.getByRole("heading", { name: "Category Split", exact: true })).toHaveCount(0);
    expect(await catalog.isWidgetSwitchOn("Category Split")).toBe(false);

    // DM-053 — Reset Layout reverts to DEFAULT_LAYOUT regardless of the toggles above.
    await catalog.resetLayoutButton.click();
    await expect(page.getByRole("heading", { name: "Billable Hours", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Category Split", exact: true })).toBeVisible();

    await catalog.close();
  });

  // DM-051 — Each toggle auto-persists immediately, not batched on "Done Editing"
  test("Toggle state survives a reload without clicking Done Editing", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const catalog = new WidgetCatalogPage(page);
    await dashboard.goto();
    await dashboard.addWidgetsToggle.click();
    await expect(catalog.panelHeading).toBeVisible();

    await catalog.toggleWidget("Billable Hours");
    await expect(page.getByRole("heading", { name: "Billable Hours", exact: true })).toBeVisible();

    // Reload WITHOUT clicking Done Editing first.
    await page.reload();
    await expect(dashboard.heading).toBeVisible();
    await expect(page.getByRole("heading", { name: "Billable Hours", exact: true })).toBeVisible();

    // Cleanup: restore default layout so this run doesn't leave the shared QA account
    // in a customized state for the next test/module.
    await dashboard.addWidgetsToggle.click();
    const catalog2 = new WidgetCatalogPage(page);
    await expect(catalog2.panelHeading).toBeVisible();
    await catalog2.resetLayoutButton.click();
    await catalog2.close();
  });

  // DM-054 — "Done Editing" only dismisses the panel, no separate save
  test("Done Editing closes the panel and reverts the header button, no extra save", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const catalog = new WidgetCatalogPage(page);
    await dashboard.goto();
    await dashboard.addWidgetsToggle.click();
    await expect(catalog.panelHeading).toBeVisible();

    await catalog.close();

    await expect(catalog.panelHeading).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add Widgets" })).toBeVisible();
  });
});
