import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { DashboardPage } from "../pages/dashboard.page";

// Group 5e: Quick Timer (AC-18)
// Source: specs_qa/dashboard-member.md DM-027, DM-028, DM-029, DM-032
//
// DM-030 (409 conflict — needs a second device/session) and DM-033 (8-hour idle alert
// gap) are NOT automated here: both need test data/preconditions this environment can't
// produce (see specs_qa/dashboard-member-exploratory-results.md, same as exploratory
// testing). DM-031's NEW stale-refresh finding lives in defect-regressions.spec.ts —
// this file only covers the parts of Quick Timer that behave as documented.

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";
const PROJECT = "Aimswebplus";
const TASK = "Testing";

test.describe("Quick Timer", () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, "TEST_USER_EMAIL / TEST_USER_PASSWORD not configured in .env");

  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(TEST_EMAIL, TEST_PASSWORD);
    // Guard against a prior test (in this file or elsewhere in the suite) leaving a
    // timer running after failing before its own cleanup step — see
    // DashboardPage.ensureTimerStopped() for why this is needed.
    await new DashboardPage(page).ensureTimerStopped();
  });

  // DM-027 — Project/Task selectors and Start-tracking gating (pre-selection state)
  test("Quick Timer starts with Project unselected, Task disabled, Start disabled", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.quickTimerProjectCombobox).toHaveText("Select");
    await expect(dashboard.quickTimerTaskCombobox).toBeDisabled();
    await expect(dashboard.quickTimerTaskCombobox).toHaveText("No tasks");
    await expect(dashboard.startTrackingButton).toBeDisabled();
  });

  // DM-028 — Selecting a project enables Task, but Start stays gated until Task is chosen
  test("Selecting a project enables Task; Start stays disabled until Task is also chosen", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.selectQuickTimerProject(PROJECT);
    await expect(dashboard.quickTimerTaskCombobox).toBeEnabled();
    await expect(dashboard.quickTimerTaskCombobox).toHaveText("Select");
    await expect(dashboard.startTrackingButton).toBeDisabled();

    await dashboard.selectQuickTimerTask(TASK);
    await expect(dashboard.startTrackingButton).toBeEnabled();
  });

  // DM-029 / DM-032 — Starting a real timer: elapsed counts from 00:00:00, view switches
  // to Active Tracking with Stop/Pause/Note, then Stop saves the entry. This test creates
  // and immediately cleans up one short-lived real time entry — same pattern used by
  // the Step-3 exploratory session (see exploratory-results.md DM-029/031/035 notes).
  test("Starting and stopping a timer records a real entry (and matches known Quick Timer gaps)", async ({
    page
  }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await dashboard.startQuickTimer(PROJECT, TASK);

    // DM-032 — known gap #654, already filed: "Stop" not "Stop Timer", no animated
    // ring (plain monospace elapsed time), extra Pause/Resume control exists. Documents
    // current, accepted reality — do not re-file.
    await expect(dashboard.stopButton).toBeVisible();
    await expect(page.getByRole("button", { name: "Stop Timer" })).toHaveCount(0);
    await expect(dashboard.pauseButton).toBeVisible();
    await expect(page.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeVisible();

    const note = `QA automation regression test - dashboard-member ${test.info().title}`;
    await dashboard.stopQuickTimer(note);

    // Cleanup: the stopped entry appears in Today's Activity Feed on reload (this IS the
    // DM-031 stale-refresh finding — see defect-regressions.spec.ts). Reload here only to
    // reach the entry for deletion, not to assert timing.
    await page.reload();
    await expect(dashboard.heading).toBeVisible();
    await dashboard.deleteActivityFeedEntriesContaining(note);
  });
});
