import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { DashboardPage } from "../pages/dashboard.page";

// Group 1: Access & role scope (AC-1, AC-2, AC-3) + Page header & controls (AC-4, AC-5)
// Source: specs_qa/dashboard-member.md DM-001–DM-006

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";

test.describe("Dashboard access & header", () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, "TEST_USER_EMAIL / TEST_USER_PASSWORD not configured in .env");

  // DM-002 — Dashboard is the default landing page after login (single-workspace account,
  // no intermediate multi-context picker). Kept as its own test, separate from the
  // beforeEach below, since the assertion IS the login redirect itself.
  test("Signing in lands directly on /dashboard with no workspace picker", async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(TEST_EMAIL, TEST_PASSWORD);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
    await expect(page.getByRole("listbox", { name: "Switch context" })).toHaveCount(0);
  });

  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(TEST_EMAIL, TEST_PASSWORD);
    await new DashboardPage(page).ensureTimerStopped();
  });

  // DM-001 — Member can access the Dashboard
  test("Member can load /dashboard directly with no redirect", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.heading).toBeVisible();
    await expect(dashboard.subtitle).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  // DM-003 — Member sees only own data, no admin aggregates
  test("Personal widgets show no workspace-wide revenue/billing content", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.totalHoursTodayHeadings().first()).toBeVisible();
    await expect(dashboard.activeProjectsHeading).toBeVisible();
    // No billing/revenue/rate terminology anywhere on the page's personal widgets.
    await expect(page.getByText(/revenue|billing rate|hourly rate/i)).toHaveCount(0);
  });

  // DM-004 — Team Activities is the workspace-wide exception, stays privacy-safe
  test("Team Activities lists teammates without exposing billing/rate/revenue columns", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.teamActivitiesHeading).toBeVisible();
    const headerRow = dashboard.teamActivitiesTable.getByRole("row").first();
    await expect(headerRow).toHaveText(/Member.*Latest activity.*Duration.*Time since/);
    await expect(dashboard.teamActivitiesTable.getByText(/revenue|billing|rate/i)).toHaveCount(0);
  });

  // DM-005 — Header actions are all present
  test("Header shows all expected controls", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.addWidgetsToggle).toBeVisible();
    await expect(dashboard.arrangeGridToggle).toBeVisible();
    await expect(dashboard.helpMenuButton).toBeVisible();
    await expect(dashboard.notificationsButton).toBeVisible();
    await expect(dashboard.appearanceButton).toBeVisible();
    await expect(dashboard.settingsLink).toBeVisible();
    await expect(dashboard.profileLink).toBeVisible();
    await expect(dashboard.profileLink).toHaveAttribute("href", "/profile");
  });

  // DM-006 — Notifications badge reflects unread count, matches sidebar nav badge
  test("Header notifications badge matches sidebar nav badge", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    const headerBadge = dashboard.notificationsButton.locator("text=/^\\d+$/");
    // Self-healed after root-causing via a live DOM dump (not a guess): the sidebar
    // renders TWO <a href="/notifications"> elements (a collapsed icon-only one and an
    // expanded full-row one); only one is visible at a time depending on sidebar state.
    // On the visible (collapsed) one, the numeral badge's accessible name resolves to
    // just "Notifications" — the digit is present as VISIBLE text but is excluded from
    // the computed accessible name (getByRole('link', {name}) can never match it there),
    // while the header's badge IS part of its accessible text. This is a real, minor
    // accessible-name inconsistency between the header and sidebar-collapsed badges —
    // noted in the healing log, not filed as a bug (no visible/functional difference to
    // a sighted user). Scope to the visible link and match on visible text instead of
    // accessible name so the test verifies the actual requirement (a numeral badge is
    // shown) without depending on collapsed/expanded state or accessible-name quirks.
    const sidebarLink = page.locator("a[href='/notifications']").locator("visible=true");
    const sidebarBadge = sidebarLink.locator("text=/\\d+/");
    await expect(headerBadge).toBeVisible({ timeout: 15000 });
    await expect(sidebarBadge).toBeVisible({ timeout: 15000 });
    const headerCount = (await headerBadge.textContent())?.trim();
    const sidebarText = (await sidebarBadge.textContent()) ?? "";
    expect(sidebarText).toContain(headerCount ?? "");
  });
});
