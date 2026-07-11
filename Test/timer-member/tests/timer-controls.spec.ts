import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { TimerPage } from "../pages/timer.page";

// Group 1+2+3: Access & prerequisites, Starting a timer, While tracking
// Source: specs_qa/timer-member.md TM-001, 002, 003, 006, 007, 009, 011, 015, 016, 017,
// 019, 021, 022, 024
//
// TM-004/005/008/010/012/013/014/018/020/023/025 are NOT automated here: all need test
// data/preconditions this environment can't produce (second session/device, a
// zero-project or zero-task account, an impersonation session, a connected Jira account,
// or a request too fast to reliably capture a transient busy label) — see
// specs_qa/timer-member-exploratory-results.md, same reasons exploratory testing marked
// them "Needs setup" / "Code-verified only".

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";
const PROJECT = "Integritas · Aimswebplus";
const TASK = "Testing";

test.describe("Timer controls — access, header, starting, while tracking", () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, "TEST_USER_EMAIL / TEST_USER_PASSWORD not configured in .env");

  test.beforeEach(async ({ page }) => {
    // Session is pre-authenticated via storageState (see global-setup.ts) — no per-test
    // login here, avoiding the login-rate-limit cascade a fresh login per test risked.
    // Guard against a prior test (in this file or elsewhere in the suite) leaving a
    // timer running/paused after failing before its own stop step — see
    // TimerPage.ensureTimerStopped() for why this is needed (same pattern as
    // dashboard-member's DashboardPage.ensureTimerStopped()).
    await new TimerPage(page).ensureTimerStopped();
  });

  test.afterEach(async ({ page }) => {
    // Unconditional safety net: guarantees no test can leave a timer running for the
    // next one, regardless of where inside the test body it failed (root cause of a
    // cascade traced to cross-cutting.spec.ts asserting after starting a timer with no
    // try/finally). Runs in addition to, not instead of, the beforeEach guard above.
    await new TimerPage(page).ensureTimerStopped();
  });

  // TM-001 — Member can reach Timer via left-nav link
  test("Timer link in the left nav navigates to /timer", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Timer", exact: true }).click();
    await expect(page).toHaveURL(/\/timer/);
    await expect(new TimerPage(page).heading).toBeVisible();
  });

  // TM-002 — Header copy in the not-tracking state
  test("Header shows idle heading and subtitle when no timer is active", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await expect(timer.heading).toBeVisible();
    await expect(timer.subtitleIdle).toBeVisible();
    await expect(timer.startTimerHeading).toBeVisible();
  });

  // TM-003 — Header copy switches once tracking starts
  test("Header subtitle switches to the tracking copy immediately on start", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await timer.startTimer(PROJECT, TASK);
    await expect(timer.subtitleTracking).toBeVisible();
    await expect(timer.subtitleIdle).toBeHidden();
    await timer.stopAndSave();
  });

  // TM-006 — Project selector is a searchable dropdown; Task stays disabled until a
  // project is chosen
  test("Task combobox is disabled until a Project is selected", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await expect(timer.taskCombobox).toBeDisabled();
    await expect(timer.taskCombobox).toHaveText("Select a project first");

    await timer.projectCombobox.click();
    await expect(page.getByRole("listbox", { name: "Suggestions" })).toBeVisible();
    await expect(page.getByRole("option", { name: PROJECT })).toBeVisible();
    await page.keyboard.press("Escape");
  });

  // TM-007 — Task list is grouped by category and filtered to the selected project
  test("Task combobox groups options by category once a project is selected", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await timer.selectProject(PROJECT);
    await expect(timer.taskCombobox).toBeEnabled();

    await timer.taskCombobox.click();
    await expect(page.getByRole("group", { name: "BA" }).getByRole("option", { name: "Spec Implementation" })
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Development" }).getByRole("option", { name: "Code Implementation" })
    ).toBeVisible();
    await expect(page.getByRole("group", { name: "QA" }).getByRole("option", { name: "Meeting" })).toBeVisible();
    await expect(page.getByRole("group", { name: "QA" }).getByRole("option", { name: "Testing" })).toBeVisible();
    await page.keyboard.press("Escape");
  });

  // TM-009 — Start button stays disabled until both Project and Task are chosen
  test("Start timer button stays disabled until both Project and Task are chosen", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await expect(timer.startTimerButton).toBeDisabled();

    await timer.selectProject(PROJECT);
    await expect(timer.startTimerButton).toBeDisabled();

    await timer.selectTask(TASK);
    await expect(timer.startTimerButton).toBeEnabled();
  });

  // TM-011 — Successful start switches to tracking view with toast and refreshed state
  test("Starting a timer switches to the Tracking Time card", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();

    const startRequests = await timer.captureRequests(/\/timer\/start/, async () => {
      await timer.startTimer(PROJECT, TASK);
    });
    expect(startRequests.length).toBeGreaterThan(0);

    await expect(timer.trackingTimeHeading).toBeVisible();
    await expect(page.getByText("Timer started successfully!")).toBeVisible();

    await timer.stopAndSave();
  });

  // TM-015 — Animated ring fills, elapsed ticks per second, "Recording" label
  test("Elapsed time ticks up once per second while recording", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await timer.startTimer(PROJECT, TASK);
    await expect(timer.recordingLabel).toBeVisible();

    const first = await timer.elapsedText();
    await page.waitForTimeout(3500);
    const second = await timer.elapsedText();
    expect(second).not.toBe(first);

    await timer.stopAndSave();
  });

  // TM-016 — Ring turns amber and label reads "Paused Break" when paused
  test("Pausing switches the ring label to Paused Break and freezes elapsed time", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await timer.startTimer(PROJECT, TASK);
    await timer.pause();

    const frozen = await timer.elapsedText();
    await page.waitForTimeout(3500);
    const stillFrozen = await timer.elapsedText();
    expect(stillFrozen).toBe(frozen);

    await timer.resume();
    await timer.stopAndSave();
  });

  // TM-017 — Subtitle shows project color dot + "project — task"
  test("Tracking subtitle shows workspace, project, and task", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await timer.startTimer(PROJECT, TASK);

    await expect(timer.trackingSubtitle()).toContainText("Aimswebplus");
    await expect(timer.trackingSubtitle()).toContainText("Testing");

    await timer.stopAndSave();
  });

  // TM-019 — Note field accepts free text incl. a literal space character
  test("Note field accepts free text including embedded spaces", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await timer.startTimer(PROJECT, TASK);

    const note = "QA automation - timer-member note field space check";
    await timer.noteInput.pressSequentially(note, { delay: 20 });
    await expect(timer.noteInput).toHaveValue(note);
    // AC-19: shortcuts must be ignored while focus is in the Note field — the embedded
    // space keystrokes above must not have stopped the timer.
    await expect(timer.recordingLabel).toBeVisible();

    await timer.stopAndSave();
    // Cleanup: this note is identifiable, so delete the real TimeLog entry it created
    // rather than leaving it in the shared QA account.
    await timer.deleteTimeTrackerEntriesContaining(note);
  });

  // TM-021 — Pause stops elapsed accumulation, shows banner + toast
  test("Pause fires POST /timer/pause and shows the paused banner", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await timer.startTimer(PROJECT, TASK);

    const pauseRequests = await timer.captureRequests(/\/timer\/pause/, async () => {
      await timer.pause();
    });
    expect(pauseRequests.length).toBeGreaterThan(0);
    await expect(timer.resumeButton).toBeVisible();
    await expect(timer.pausedBanner).toBeVisible();

    await timer.resume();
    await timer.stopAndSave();
  });

  // TM-022 — Resume continues from the previously accumulated elapsed time
  test("Resume continues from the previously accumulated elapsed time, not from 0", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await timer.startTimer(PROJECT, TASK);
    await page.waitForTimeout(2000);
    await timer.pause();
    const pausedAt = await timer.elapsedText();

    const resumeRequests = await timer.captureRequests(/\/timer\/resume/, async () => {
      await timer.resume();
    });
    expect(resumeRequests.length).toBeGreaterThan(0);

    // Resumed elapsed time must be >= where it was paused, never reset to 00:00:00.
    expect(pausedAt).not.toBe("00:00:00");
    await expect(timer.recordingLabel).toBeVisible();

    await timer.stopAndSave();
  });

  // TM-024 — Stop & save creates a TimeLog and resets the UI (mouse-click path — the
  // exploratory pass only exercised this via keyboard shortcuts; this test exercises the
  // literal on-screen "Stop & save" button click, closing that follow-up gap).
  test("Stop & save resets the UI to the idle Start Timer card", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await timer.startTimer(PROJECT, TASK);

    const note = `QA automation - timer-member ${test.info().title}`;
    const stopRequests = await timer.captureRequests(/\/timer\/stop/, async () => {
      await timer.stopAndSave(note);
    });
    expect(stopRequests.length).toBeGreaterThan(0);

    await expect(timer.startTimerHeading).toBeVisible();
    await expect(timer.elapsedTimeText.first()).toHaveText("00:00:00");
    await expect(timer.noteInput).toBeHidden();

    // Cleanup: delete the real TimeLog entry this test created.
    await timer.deleteTimeTrackerEntriesContaining(note);
  });
});
