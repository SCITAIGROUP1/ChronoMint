import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { TimerPage } from "../pages/timer.page";

// Group 4: Keyboard shortcuts (AC-17–AC-21)
// Source: specs_qa/timer-member.md TM-026–TM-035
//
// These tests deliberately start/stop timers via keyboard shortcuts only (no Note text),
// mirroring the exploratory pass's own choice to limit the number of throwaway time-log
// entries created while exercising the shortcut mechanics (see
// specs_qa/timer-member-exploratory-results.md's "Notable findings" #1/#2).

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";
const PROJECT = "Integritas · Aimswebplus";
const TASK = "Testing";

test.describe("Keyboard shortcuts", () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, "TEST_USER_EMAIL / TEST_USER_PASSWORD not configured in .env");

  test.beforeEach(async ({ page }) => {
    // Session is pre-authenticated via storageState (see global-setup.ts) — no per-test
    // login here, avoiding the login-rate-limit cascade a fresh login per test risked.
    await new TimerPage(page).ensureTimerStopped();
  });

  test.afterEach(async ({ page }) => {
    // Unconditional safety net: guarantees no test can leave a timer running for the
    // next one, regardless of where inside the test body it failed (root cause of a
    // cascade traced to cross-cutting.spec.ts asserting after starting a timer with no
    // try/finally). Runs in addition to, not instead of, the beforeEach guard above.
    await new TimerPage(page).ensureTimerStopped();
  });

  // TM-026 — Space starts the timer when idle, project+task selected, focus outside inputs
  test("Space starts the timer when idle with focus outside any input", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await timer.selectProject(PROJECT);
    await timer.selectTask(TASK);

    await timer.pressSpace();

    await expect(timer.trackingTimeHeading).toBeVisible();
    await expect(page.getByText("Timer started successfully!")).toBeVisible();
    await expect(page).toHaveTitle(/^⏱️ \d{2}:\d{2}:\d{2} — Kloqra$/);

    await timer.stopSaveButton.click();
  });

  // TM-027 — Space stops the timer when tracking
  test("Space stops the timer when tracking", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await timer.startTimer(PROJECT, TASK);

    await timer.pressSpace();

    await expect(timer.startTimerHeading).toBeVisible();
    await expect(page).toHaveTitle("Kloqra");
  });

  // TM-028 — Ctrl+Shift+T (secondary shortcut) toggles Start/Stop
  test("Ctrl+Shift+T toggles Start and Stop", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await timer.selectProject(PROJECT);
    await timer.selectTask(TASK);

    await timer.pressCtrlShiftT();
    await expect(timer.trackingTimeHeading).toBeVisible();

    await timer.pressCtrlShiftT();
    await expect(timer.startTimerHeading).toBeVisible();
    await expect(page).toHaveTitle("Kloqra");
  });

  // TM-029 — Shift+Space toggles Pause/Resume while tracking
  test("Shift+Space toggles Pause and Resume while tracking", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await timer.startTimer(PROJECT, TASK);

    await timer.pressShiftSpace();
    await expect(timer.pausedLabel).toBeVisible();
    await expect(page).toHaveTitle(/^⏸️ \d{2}:\d{2}:\d{2} — Kloqra$/);

    await timer.pressShiftSpace();
    await expect(timer.recordingLabel).toBeVisible();
    await expect(page).toHaveTitle(/^⏱️ \d{2}:\d{2}:\d{2} — Kloqra$/);

    await timer.stopSaveButton.click();
  });

  // TM-030 — Shortcuts are ignored while focus is in the Note field (or any input)
  test("Shortcuts are ignored while typing in the Note field", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await timer.startTimer(PROJECT, TASK);

    await timer.noteInput.click();
    await timer.noteInput.pressSequentially("QA note with a space typed", { delay: 20 });

    // The embedded space keystrokes above must NOT have stopped the timer.
    await expect(timer.recordingLabel).toBeVisible();
    await expect(page).toHaveTitle(/^⏱️/);

    await timer.noteInput.fill("");
    await timer.stopSaveButton.click();
  });

  // TM-031 — On-screen shortcut hint while tracking
  test("On-screen hint shows the stop/pause shortcuts while tracking", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await timer.startTimer(PROJECT, TASK);

    await expect(timer.trackingHint).toContainText("Press Space to stop");
    await expect(timer.trackingHint).toContainText("Shift+Space to pause/resume break");

    await timer.stopSaveButton.click();
  });

  // TM-032 — On-screen shortcut hint while idle
  test("On-screen hint shows the start shortcuts while idle", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await expect(timer.idleHint).toHaveText("Tip: Press Space or Ctrl+Shift+T to start");
  });

  // TM-033 — Tab title updates live while recording
  test("Tab title updates live (ticking HH:MM:SS) while recording", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await timer.startTimer(PROJECT, TASK);

    const firstTitle = await page.title();
    expect(firstTitle).toMatch(/^⏱️ \d{2}:\d{2}:\d{2} — Kloqra$/);

    await page.waitForTimeout(3500);
    const secondTitle = await page.title();
    expect(secondTitle).not.toBe(firstTitle);

    await timer.stopSaveButton.click();
  });

  // TM-034 — Tab title switches to the pause emoji when paused
  test("Tab title switches to the pause emoji when paused", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await timer.startTimer(PROJECT, TASK);
    await timer.pause();

    await expect(page).toHaveTitle(/^⏸️ \d{2}:\d{2}:\d{2} — Kloqra$/);

    await timer.resume();
    await timer.stopSaveButton.click();
  });

  // TM-035 — Tab title reverts to app name when stopped
  test("Tab title reverts to plain app name when stopped", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await timer.startTimer(PROJECT, TASK);
    await expect(page).toHaveTitle(/^⏱️/);

    await timer.stopSaveButton.click();

    await expect(page).toHaveTitle("Kloqra");
  });
});
