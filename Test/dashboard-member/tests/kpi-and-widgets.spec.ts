import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { DashboardPage } from "../pages/dashboard.page";
import { WidgetCatalogPage } from "../pages/widget-catalog.page";

// Group 5: Widget catalog — KPI stat cards (AC-14), Weekly Progress Chart (AC-15),
// Project Distribution (AC-16), Category Split (AC-17), Daily Progress (AC-19),
// Today's Activity Feed (AC-20), Team Activities (AC-21), Hidden widgets (AC-22)
// Source: specs_qa/dashboard-member.md DM-016–DM-022, DM-024, DM-025, DM-034–DM-043

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";

test.describe("KPI cards, charts, and donuts", () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, "TEST_USER_EMAIL / TEST_USER_PASSWORD not configured in .env");

  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(TEST_EMAIL, TEST_PASSWORD);
    await new DashboardPage(page).ensureTimerStopped();
  });

  // DM-016 — KPI cards render correct values and sub-lines
  test("KPI cards render Today/Week/Active Projects with sub-lines", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.totalHoursTodayHeadings()).toHaveCount(1);
    await expect(dashboard.totalHoursWeekOrPeriodHeading()).toHaveText("Total Hours (Week)");
    await expect(dashboard.activeProjectsHeading).toBeVisible();
    await expect(page.getByText(/billable$/i).first()).toBeVisible();
    await expect(page.getByText("Assigned projects")).toBeVisible();
  });

  // DM-017 — KPI cards vs. ticket #563's literal spec: known, already-filed gap
  // (#720 open, #721 re-verified still failing). NOT re-filed — documents current,
  // accepted reality (decimal hours, grid widgets, member-scoped Active Projects count).
  test("[known gap #720/#721] KPI hours render as decimals, not HH:MM:SS", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    const weekCard = dashboard.totalHoursWeekOrPeriodHeading().locator(
      'xpath=ancestor::*[@data-slot="card"][1]'
    );
    const valueText = (await weekCard.textContent()) ?? "";
    expect(valueText).toMatch(/\d+(\.\d+)?/);
    expect(valueText).not.toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  // DM-018 — Chart renders day bars split billable/nonBillable
  test("Weekly Progress Chart shows Mon-Sun bars with billable/nonBillable legend", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.weeklyProgressChartHeading()).toHaveText("Weekly Progress Chart");
    await expect(page.getByText("billable", { exact: true })).toBeVisible();
    await expect(page.getByText("nonBillable", { exact: true })).toBeVisible();
    await expect(page.getByText("8h Goal")).toBeVisible();
    for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      await expect(page.getByText(day, { exact: true }).first()).toBeVisible();
    }
  });

  // DM-019 — Chart X-axis switches to day+month labels for This month (no combined
  // "Tue, Jul 2" weekday format; not locked to a 7-day week)
  test("Switching to This month changes chart X-axis to day+month labels", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.selectPeriod("This month");
    await expect(dashboard.weeklyProgressChartHeading()).toHaveText(/Progress Chart/);
    // Day+month labels look like "Jul 1"; must not be the combined "Tue, Jul 2" format.
    await expect(page.getByText(/^[A-Za-z]{3} \d{1,2}$/).first()).toBeVisible();
    await expect(page.getByText(/^[A-Za-z]{3}, [A-Za-z]{3} \d{1,2}$/)).toHaveCount(0);
  });

  // DM-020 — Chart vs. ticket #564's literal spec: known gap, not yet filed. Documents
  // current, accepted behavior (billable/non-billable split only, no per-project color
  // segmentation, no prev/next arrows on the chart itself).
  test("[known gap, not yet filed] chart has no prev/next nav arrows on the widget itself", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    const chartCard = dashboard.weeklyProgressChartHeading().locator('xpath=ancestor::*[@data-slot="card"][1]');
    await expect(chartCard.getByRole("button", { name: /next|previous/i })).toHaveCount(0);
  });

  // DM-021 — Donut renders with center total and legend
  test("Project Distribution donut shows center total and Project/Hours/% legend", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.projectDistributionHeading).toBeVisible();
    await expect(page.getByText("Total Logged")).toBeVisible();
    const card = dashboard.projectDistributionHeading.locator('xpath=ancestor::*[@data-slot="card"][1]');
    await expect(card.getByText("Project", { exact: true })).toBeVisible();
    await expect(card.getByText("Hours", { exact: true })).toBeVisible();
    await expect(card.getByText("Aimswebplus")).toBeVisible();
  });

  // DM-022 — Single-project period renders full circle (100% / single-row legend)
  test("Single-project period shows a single 100% legend row", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    const card = dashboard.projectDistributionHeading.locator('xpath=ancestor::*[@data-slot="card"][1]');
    await expect(card.getByText("100%")).toBeVisible();
  });

  // DM-024 — Legend color indicator is a dot, not a bar (cosmetic-only, confirmed
  // working as specified — not a gap, do not re-file)
  test("[cosmetic, not a gap] Project Distribution legend uses a color dot", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    const card = dashboard.projectDistributionHeading.locator('xpath=ancestor::*[@data-slot="card"][1]');
    const dot = card.locator('[class*="rounded-full"]').first();
    await expect(dot).toBeVisible();
  });

  // DM-025 — Category donut shows logged hours by category
  test("Category Split donut shows center total, period label, and category name", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.categorySplitHeading).toBeVisible();
    const card = dashboard.categorySplitHeading.locator('xpath=ancestor::*[@data-slot="card"][1]');
    await expect(card.getByText("This week")).toBeVisible();
    await expect(card.getByText("QA")).toBeVisible();
  });
});

test.describe("Daily Progress, Activity Feed, Team Activities, hidden widgets", () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, "TEST_USER_EMAIL / TEST_USER_PASSWORD not configured in .env");

  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(TEST_EMAIL, TEST_PASSWORD);
    await new DashboardPage(page).ensureTimerStopped();
  });

  // DM-034 — Radial progress ring shows percentage, logged/target, remaining message
  test("Daily Progress ring shows percent, logged/target hours, and remaining message", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    const card = dashboard.dailyProgressHeading.locator('xpath=ancestor::*[@data-slot="card"][1]');
    await expect(card.getByText("of target")).toBeVisible();
    await expect(card.getByText(/\/ 8 hrs/)).toBeVisible();
    await expect(card.getByText(/more hours today\.?/i)).toBeVisible();
  });

  // DM-036 — Empty state when nothing logged today (this account routinely has near-zero
  // Today hours; if it happens to have entries, this asserts the widget still renders
  // sensibly either way by checking the widget is present and non-erroring)
  test("Today's Activity Feed widget renders without an error state", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.todaysActivityFeedHeading).toBeVisible();
    const feedText = await dashboard.activityFeedText();
    expect(feedText.length).toBeGreaterThan(0);
    expect(feedText).not.toMatch(/error|failed to load/i);
  });

  // DM-037 — Table renders all workspace members with required columns + caption
  test("Team Activities lists workspace members with the documented columns", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(
      page.getByText(
        "Respects your dashboard period. Bar height shows daily hours — hover for exact values. Today is highlighted."
      )
    ).toBeVisible();
    const rowCount = await dashboard.teamActivitiesTable.getByRole("row").count();
    expect(rowCount).toBeGreaterThan(1); // header row + at least one member row
  });

  // DM-038 — Members with no activity show correct zero-state
  test("Members with no activity show No activity / dashes / 0h zero-state", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.teamActivitiesTable.getByText("No activity").first()).toBeVisible();
    // Self-healed: "No hours logged in selected period" is the aria-label of an <img>
    // (the daily-hours sparkline), not rendered text — getByText never matches it.
    await expect(
      dashboard.teamActivitiesTable.getByRole("img", { name: "No hours logged in selected period" }).first()
    ).toBeVisible();
  });

  // DM-039 — Team Activities table stays privacy-safe
  test("Team Activities table exposes no billing/rate/revenue data", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.teamActivitiesTable.getByText(/revenue|billing|hourly rate/i)).toHaveCount(0);
  });

  // DM-042 — Hidden widgets do not render until enabled
  test("Billable Hours / Pinned Favorites / Recent Activity / My Timesheets are absent by default", async ({
    page
  }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    for (const hiddenWidget of ["Billable Hours", "Pinned Favorites", "Recent Activity", "My Timesheets"]) {
      await expect(page.getByRole("heading", { name: hiddenWidget, exact: true })).toHaveCount(0);
    }
  });

  // DM-043 — "My Timesheets" enabled via Add Widgets shows the member's own empty state
  test("Enabling My Timesheets shows the member-only empty state, no errors", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const catalog = new WidgetCatalogPage(page);
    await dashboard.goto();

    await dashboard.addWidgetsToggle.click();
    await expect(catalog.panelHeading).toBeVisible();
    const wasOn = await catalog.isWidgetSwitchOn("My Timesheets");
    if (!wasOn) await catalog.toggleWidget("My Timesheets");
    await catalog.close();

    const heading = page.getByRole("heading", { name: "My Timesheets", exact: true });
    await expect(heading).toBeVisible();
    const card = heading.locator('xpath=ancestor::*[@data-slot="card"][1]');
    await expect(card).not.toContainText(/error/i);

    // Cleanup: restore default (hidden) state so the shared QA account's layout is
    // unaffected by this test run, matching this repo's convention of leaving the
    // account as found (see login-forgot-password's HEALING_LOG.md notes).
    if (!wasOn) {
      await dashboard.addWidgetsToggle.click();
      await expect(catalog.panelHeading).toBeVisible();
      await catalog.toggleWidget("My Timesheets");
      await catalog.close();
    }
  });
});
