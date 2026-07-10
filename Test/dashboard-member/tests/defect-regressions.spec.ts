import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { DashboardPage } from "../pages/dashboard.page";

// Defect-regression tests — NEW discrepancies found during Step 3 exploratory testing
// (specs_qa/dashboard-member-exploratory-results.md), not part of the original 66-scenario
// plan. These are EXPECTED TO FAIL until the underlying product bugs are fixed. Per the
// QA workflow's guardrail, they are NOT self-healed or softened — left red on purpose,
// same pattern as login-forgot-password's logout-security.spec.ts.

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";
const PROJECT = "Aimswebplus";
const TASK = "Testing";

test.describe("Defect regressions — new findings from exploratory testing", () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, "TEST_USER_EMAIL / TEST_USER_PASSWORD not configured in .env");

  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(TEST_EMAIL, TEST_PASSWORD);
    // Guard against a prior test leaving a timer running after failing before its own
    // cleanup step (this file's own DM-031 test is itself expected-to-fail, so its
    // post-assertion cleanup never runs) — see DashboardPage.ensureTimerStopped().
    await new DashboardPage(page).ensureTimerStopped();
  });

  // DM-008 — NEW: switching Period to "Today" produces TWO KPI cards with the
  // identical heading "Total Hours (Today)" (the always-today card and the
  // period-following card, which should have relabeled but didn't), showing different
  // values with no visual distinction. Reproduced live: count is 2, not 1.
  // EXPECTED TO FAIL until the period-following card gets its own distinct label when
  // Period = Today (it already correctly relabels to "Total Hours (Period)" for
  // "This month" — this is the same relabeling logic just not covering the Today case).
  test("[DEFECT][DM-008] Total Hours (Today) heading must not appear twice when Period=Today", async ({
    page
  }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await dashboard.selectPeriod("Today");
    await page.waitForTimeout(800);

    const headings = dashboard.totalHoursTodayHeadings();
    const count = await headings.count();
    const texts = await headings.evaluateAll((els) =>
      els.map((el) => el.closest('[data-slot="card"]')?.textContent ?? el.textContent)
    );

    expect(
      count,
      "Exactly one KPI card should read 'Total Hours (Today)'. Found: " + JSON.stringify(texts)
    ).toBe(1);
  });

  // DM-011 / DM-023 / DM-026 — NEW, MAJOR: any custom date range that doesn't already
  // span "today" gets silently widened for the /timelogs-backed widgets (KPI cards,
  // Project Distribution, Category Split, Weekly Progress Chart): from=min(picked,today),
  // to=max(picked,today). A genuinely empty past period shows STALE non-zero data
  // instead of the correct empty state. Team Activities (separate endpoint,
  // /workspaces/.../team-activities) does NOT have this bug and correctly shows the
  // empty state for the exact same picked range — producing visibly contradictory data
  // on the same screen. This test proves both halves: (1) captures the actual /timelogs
  // request and asserts its `to` param was NOT the picked date (clamped to include
  // today), and (2) asserts the KPI card contradicts Team Activities for the same range.
  // EXPECTED TO FAIL until the /timelogs query building stops silently including today.
  test("[DEFECT][DM-011/023/026] past date range with no data must not silently include today", async ({
    page
  }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    // A range firmly in the past, 6 months back — this account has no logged time there.
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth() - 6, 5);
    const to = new Date(today.getFullYear(), today.getMonth() - 6, 10);

    const timelogRequests = await dashboard.captureRequests(
      /\/timelogs\?/,
      async () => {
        await dashboard.pickCustomDateRange(from, to);
      },
      2500
    );
    expect(timelogRequests.length, "expected at least one /timelogs request after picking the range").toBeGreaterThan(
      0
    );

    const lastRequestUrl = new URL(timelogRequests[timelogRequests.length - 1].url());
    const requestedTo = lastRequestUrl.searchParams.get("to") ?? "";
    const requestedToDate = new Date(requestedTo);
    const pickedToDate = to;
    const daysBetween = (requestedToDate.getTime() - pickedToDate.getTime()) / (1000 * 60 * 60 * 24);

    // THE BUG: the actual request's `to` should be within ~1 day of the picked date
    // (calendar/timezone rounding), but instead gets pushed out to include today —
    // 6 months later in this test's case. Assert the gap is small — this is expected
    // to FAIL, proving the clamp is still happening.
    expect(
      daysBetween < 3,
      `/timelogs was requested with to=${requestedTo}, which is ${daysBetween.toFixed(1)} days after the ` +
        `picked end date (${pickedToDate.toDateString()}) — proof the range was silently widened to ` +
        `include today, per the exploratory findings (DM-011).`
    ).toBe(true);

    // Cross-widget contradiction: Team Activities (separate, non-clamped endpoint)
    // correctly shows the empty state for this exact range, while the KPI card
    // (clamped) shows stale non-zero data for "the same" selected range.
    await expect(page.getByText("No activity").first()).toBeVisible();
    const weekOrPeriodCard = dashboard
      .totalHoursWeekOrPeriodHeading()
      .locator('xpath=ancestor::*[@data-slot="card"][1]');
    const kpiText = (await weekOrPeriodCard.textContent()) ?? "";
    const firstNumberMatch = kpiText.match(/\d+(\.\d+)?/);
    const firstNumber = firstNumberMatch ? Number(firstNumberMatch[0]) : 0;
    expect(
      firstNumber,
      `KPI card should show 0 for this genuinely empty past range, but showed: "${kpiText}"`
    ).toBe(0);
  });

  // DM-031 — NEW: after stopping a Quick Timer, "Today's Activity Feed" and the
  // "Total Hours (Today)" KPI card do not auto-refresh for 6+ seconds; only a manual
  // page reload picks up the new entry. Data is not lost (confirmed via the
  // /timer/stop response and a reload), this is a stale-UI-after-stop bug.
  // EXPECTED TO FAIL until the dashboard's own widgets re-fetch after Stop without
  // requiring a manual reload.
  test("[DEFECT][DM-031] dashboard widgets must refresh within 5s of stopping a Quick Timer", async ({
    page
  }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    const note = `QA automation regression test - dashboard-member DM-031 ${Date.now()}`;
    await dashboard.startQuickTimer(PROJECT, TASK);
    await page.waitForTimeout(1200); // let a non-zero elapsed time accrue
    await dashboard.stopQuickTimer(note);

    // Give the dashboard a realistic window to auto-refresh (5s) — per the exploratory
    // finding, it does NOT, and only updates after a full manual reload.
    await page.waitForTimeout(5000);

    const feedText = await dashboard.activityFeedText();
    expect(
      feedText.includes(note),
      "Today's Activity Feed should show the just-stopped entry within 5s without a manual reload"
    ).toBe(true);

    // Cleanup regardless of pass/fail: reload (which DOES show the entry, per the
    // known root cause) and delete it so the account isn't left with extra test data.
    await page.reload();
    await expect(dashboard.heading).toBeVisible();
    await dashboard.deleteActivityFeedEntriesContaining(note);
  });
});
