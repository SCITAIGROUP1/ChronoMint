import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Member Timer page object (`/timer`) — Start Timer / Tracking Time cards, keyboard
 * shortcuts' on-screen hints, Daily Progress (gauge, 7-day grid, milestones), Yesterday
 * summary, Pinned Favorites, Recent Activity.
 *
 * Every locator here was confirmed live against https://chrono-mint-client.vercel.app/timer
 * (peter123@yopmail.com, workspace "Integritas") during this suite's build session via
 * Playwright MCP, cross-checked against specs_qa/timer-member.md and
 * specs_qa/timer-member-exploratory-results.md. See HEALING_LOG.md for anything that
 * needed adjusting after the first automated run.
 *
 * Structural notes confirmed live (not guessed):
 * - Every card (Start Timer / Tracking Time, Daily Progress, Pinned Favorites, Recent
 *   Activity) is a shadcn/ui `Card` (`[data-slot="card"]`) wrapping an `h3` heading, same
 *   pattern as dashboard-member's DashboardPage.widgetCard().
 * - The 7-day Weekly Progress grid and the 4 Milestone badges render their tooltip text
 *   as a plain HTML `title` attribute (native browser tooltip), NOT an ARIA
 *   tooltip/aria-label — confirmed via `document.querySelectorAll('[title]')`. Milestone
 *   tooltips are static text; grid-day tooltips embed the date, so callers should match
 *   on the "(Status)" suffix (No logs / Goal Met / In Progress / Weekend) via a substring
 *   attribute selector rather than hardcoding a date that will drift day to day.
 * - Recent Activity chips and Pinned Favorites chips are both plain `<button>`s with no
 *   aria-label; their accessible name is the space-joined text of two child spans
 *   ("Aimswebplus" + "Testing" -> "Aimswebplus Testing"), confirmed identical for both
 *   widgets.
 */
export class TimerPage {
  readonly page: Page;

  // Header
  readonly heading: Locator;
  readonly subtitleIdle: Locator;
  readonly subtitleTracking: Locator;

  // Start Timer card (idle)
  readonly startTimerHeading: Locator;
  readonly idleHint: Locator;
  readonly projectCombobox: Locator;
  readonly taskCombobox: Locator;
  readonly startTimerButton: Locator;

  // Tracking Time card
  readonly trackingTimeHeading: Locator;
  readonly trackingHint: Locator;
  readonly recordingLabel: Locator;
  readonly pausedLabel: Locator;
  readonly noteInput: Locator;
  readonly pauseBreakButton: Locator;
  readonly resumeButton: Locator;
  readonly stopSaveButton: Locator;
  readonly pausedBanner: Locator;
  readonly elapsedTimeText: Locator;

  // Daily Progress
  readonly dailyProgressHeading: Locator;
  readonly editGoalButton: Locator;
  readonly goalSpinbutton: Locator;
  readonly saveGoalButton: Locator;
  readonly cancelGoalButton: Locator;
  readonly gaugePercentText: Locator;
  readonly ofTargetText: Locator;
  readonly needMoreHoursText: Locator;
  readonly streakPill: Locator;
  readonly weeklyProgressLabel: Locator;
  readonly milestonesHeading: Locator;

  // Yesterday summary
  readonly yesterdayLabel: Locator;

  // Pinned Favorites
  readonly pinnedFavoritesHeading: Locator;
  readonly pinButton: Locator;
  readonly pinnedEmptyText: Locator;

  // Recent Activity
  readonly recentActivityHeading: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole("heading", { name: "Timer", level: 1 });
    this.subtitleIdle = page.getByText("Choose a project and task before you start tracking.");
    this.subtitleTracking = page.getByText(
      "Manage your ongoing timer. Pausing allows taking breaks without breaking logs."
    );

    this.startTimerHeading = page.getByRole("heading", { name: "Start Timer", exact: true });
    this.idleHint = page.getByText("Tip: Press Space or Ctrl+Shift+T to start");
    this.projectCombobox = page.getByRole("combobox", { name: "Project" });
    this.taskCombobox = page.getByRole("combobox", { name: "Task" });
    this.startTimerButton = page.getByRole("button", { name: "Start timer", exact: true });

    this.trackingTimeHeading = page.getByRole("heading", { name: "Tracking Time", exact: true });
    this.trackingHint = page.getByText("Press Space to stop", { exact: false });
    this.recordingLabel = page.getByText("Recording", { exact: true });
    this.pausedLabel = page.getByText("Paused Break", { exact: true });
    this.noteInput = page.getByRole("textbox", { name: "Note (optional)" });
    this.pauseBreakButton = page.getByRole("button", { name: "Pause break", exact: true });
    this.resumeButton = page.getByRole("button", { name: "Resume", exact: true });
    this.stopSaveButton = page.getByRole("button", { name: "Stop & save", exact: true });
    this.pausedBanner = page.getByText("Timer is paused. Resume when you're back, or stop to save.", {
      exact: false
    });
    // Elapsed HH:MM:SS is only ever rendered inside the ring (idle "00:00:00" or a
    // live-ticking value while tracking/paused) — unique format on this page.
    this.elapsedTimeText = page.getByText(/^\d{2}:\d{2}:\d{2}$/);

    this.dailyProgressHeading = page.getByRole("heading", { name: /^Daily Progress/ });
    this.editGoalButton = page.getByRole("button", { name: "Edit daily goal" });
    this.goalSpinbutton = page.getByRole("spinbutton");
    this.saveGoalButton = page.getByRole("button", { name: "Save", exact: true });
    this.cancelGoalButton = page.getByRole("button", { name: "Cancel", exact: true });
    this.gaugePercentText = page.getByText(/^\d+%$/, { exact: true });
    this.ofTargetText = page.getByText("of target", { exact: true });
    this.needMoreHoursText = page.getByText(/Need [\d.]+ more hours today\./);
    this.streakPill = page.getByText(/\d+ Day Streak!/);
    this.weeklyProgressLabel = page.getByText("Weekly Progress", { exact: true });
    this.milestonesHeading = page.getByText("Milestones (Last 14 Days)", { exact: true });

    this.yesterdayLabel = page.getByText("Yesterday", { exact: true });

    this.pinnedFavoritesHeading = page.getByRole("heading", { name: "Pinned Favorites (Max 3)", exact: true });
    this.pinButton = page.getByRole("button", { name: /^(Pin current task|Unpin current task)$/ });
    this.pinnedEmptyText = page.getByText(
      "No pinned tasks yet. Select a project and task above, then click the pin button."
    );

    this.recentActivityHeading = page.getByRole("heading", { name: "Recent Activity", exact: true });
  }

  // ---- Navigation -------------------------------------------------------

  async goto() {
    if (!this.page.url().includes("/timer")) {
      await this.page.goto("/timer");
    }
    await expect(this.heading).toBeVisible();
  }

  /**
   * Widget "card" container — same `[data-slot="card"]` shadcn/ui pattern as
   * dashboard-member's DashboardPage.widgetCard(), confirmed live for every card on this
   * page (Start Timer/Tracking Time, Daily Progress, Pinned Favorites, Recent Activity).
   */
  private widgetCard(heading: Locator): Locator {
    return heading.locator('xpath=ancestor::*[@data-slot="card"][1]');
  }

  pinnedFavoritesWidget(): Locator {
    return this.widgetCard(this.pinnedFavoritesHeading);
  }

  recentActivityWidget(): Locator {
    return this.widgetCard(this.recentActivityHeading);
  }

  dailyProgressWidget(): Locator {
    return this.widgetCard(this.dailyProgressHeading);
  }

  // ---- Test-hygiene guard -------------------------------------------------

  /**
   * Guard against a prior test (in this file or elsewhere in the suite) leaving a timer
   * running or paused after failing before its own stop/cleanup step — mirrors
   * DashboardPage.ensureTimerStopped() from ../dashboard-member/pages/dashboard.page.ts,
   * adapted for this page's own Stop & save control (visible in both the tracking AND
   * paused states here, so a single click always works regardless of which state a
   * leftover timer was left in).
   */
  async ensureTimerStopped() {
    await this.goto();
    if (await this.stopSaveButton.isVisible().catch(() => false)) {
      await this.stopSaveButton.click();
      // Self-healed: same class of bug as LoginPage.login() — the default 5s expect()
      // timeout is occasionally too short for the stop-and-save round trip + re-render,
      // which was silently swallowing this guard's own failures (via test.beforeEach
      // throwing) and letting a leftover timer cascade into many later tests.
      await expect(this.stopSaveButton).toBeHidden({ timeout: 15000 });
    }
  }

  // ---- Starting a timer ---------------------------------------------------

  private async selectComboboxOption(combobox: Locator, optionName: string) {
    await combobox.click();
    const option = this.page.getByRole("option", { name: optionName, exact: true });
    // Self-healed: the dropdown's open animation occasionally isn't settled yet when the
    // click fires immediately after opening, causing an intermittent (recovers on retry)
    // "waiting for option" timeout. Wait for the option to actually be visible before
    // clicking, rather than relying on Playwright's own auto-wait plus retry to paper
    // over it.
    await option.waitFor({ state: "visible" });
    await option.click();
  }

  async selectProject(name: string) {
    await this.selectComboboxOption(this.projectCombobox, name);
  }

  async selectTask(name: string) {
    await this.selectComboboxOption(this.taskCombobox, name);
  }

  async startTimer(project: string, task: string) {
    await this.selectProject(project);
    await this.selectTask(task);
    await expect(this.startTimerButton).toBeEnabled();
    await this.startTimerButton.click();
    await expect(this.trackingTimeHeading).toBeVisible();
  }

  // ---- While tracking -------------------------------------------------

  /** Reads the "workspace · project · task" subtitle shown while a timer is tracking. */
  trackingSubtitle(): Locator {
    return this.page.getByText(/^[^·]+ · [^·]+ · [^·]+$/);
  }

  async pause() {
    await this.pauseBreakButton.click();
    await expect(this.pausedLabel).toBeVisible();
  }

  async resume() {
    await this.resumeButton.click();
    await expect(this.recordingLabel).toBeVisible();
  }

  async stopAndSave(note?: string) {
    if (note) {
      await this.noteInput.fill(note);
    }
    await this.stopSaveButton.click();
    await expect(this.startTimerHeading).toBeVisible({ timeout: 15000 });
  }

  /** Current elapsed-time ring value as HH:MM:SS text, whichever state it's in. */
  async elapsedText(): Promise<string> {
    return (await this.elapsedTimeText.first().textContent()) ?? "";
  }

  // ---- Keyboard shortcuts -------------------------------------------------

  /** Clicks a neutral heading to move focus out of any input before firing a shortcut. */
  async blurToNeutralFocus() {
    await this.heading.click();
  }

  async pressSpace() {
    await this.blurToNeutralFocus();
    await this.page.keyboard.press("Space");
  }

  async pressCtrlShiftT() {
    await this.blurToNeutralFocus();
    await this.page.keyboard.press("Control+Shift+T");
  }

  async pressShiftSpace() {
    await this.blurToNeutralFocus();
    await this.page.keyboard.press("Shift+Space");
  }

  // ---- Daily Progress ---------------------------------------------------

  async openEditGoal() {
    await this.editGoalButton.click();
    await expect(this.goalSpinbutton).toBeVisible();
  }

  async cancelEditGoal() {
    await this.cancelGoalButton.click();
    await expect(this.goalSpinbutton).toBeHidden();
  }

  /**
   * A 7-day grid cell matching the given status suffix, e.g. "(Weekend)" / "(No logs)" /
   * "(Goal Met)" / "(In Progress)". Uses the `title` attribute's status suffix rather than
   * the embedded date, since the date text shifts day to day and would make the locator
   * brittle across re-runs on different days.
   */
  weekGridCellsWithStatus(status: "No logs" | "Goal Met" | "In Progress" | "Weekend"): Locator {
    return this.page.locator(`[title*="(${status})"]`);
  }

  /** A Milestone badge by its exact static tooltip description (title attribute). */
  milestoneBadge(tooltip: string): Locator {
    return this.page.getByTitle(tooltip, { exact: true });
  }

  // ---- Pinned Favorites / Recent Activity --------------------------------

  favoriteChip(name: string): Locator {
    return this.pinnedFavoritesWidget().getByRole("button", { name, exact: true });
  }

  recentActivityChip(name: string): Locator {
    return this.recentActivityWidget().getByRole("button", { name, exact: true });
  }

  async togglePin() {
    await this.pinButton.click();
  }

  // ---- Time Tracker cleanup (mirrors dashboard-member's deleteActivityFeedEntriesContaining) --

  /**
   * Deletes every entry in Time Tracker (any visible week) whose text contains `text`.
   * Used to clean up real TimeLog entries this suite's own tests create when they type an
   * identifiable note (e.g. TM-019, TM-024) — same pattern as
   * DashboardPage.deleteActivityFeedEntriesContaining(), adapted to Time Tracker's
   * separate page and its "Entry actions" menu -> "Delete" -> confirm dialog flow
   * (confirmed live: `button[aria-label="Entry actions"]` opens a menu with "Edit"/
   * "Delete", and "Delete" opens an "alertdialog" with its own "Delete" confirm button).
   */
  async deleteTimeTrackerEntriesContaining(text: string) {
    if (!this.page.url().includes("/time-tracker")) {
      await this.page.goto("/time-tracker");
    }
    for (let i = 0; i < 10; i++) {
      const marker = this.page.getByText(text, { exact: false }).first();
      if (!(await marker.isVisible().catch(() => false))) break;
      const row = marker.locator('xpath=ancestor::*[.//button[@aria-label="Entry actions"]][1]');
      await row.getByRole("button", { name: "Entry actions" }).click();
      await this.page.getByRole("menuitem", { name: "Delete" }).click();
      await this.page.getByRole("alertdialog", { name: "Delete time entry?" }).getByRole("button", { name: "Delete" }).click();
      await this.page.waitForTimeout(300);
    }
  }

  // ---- Network capture helper (mirrors dashboard-member's pattern) -------------

  async captureRequests(
    urlPattern: RegExp,
    action: () => Promise<void>,
    settleMs = 2000
  ): Promise<import("@playwright/test").Request[]> {
    const requests: import("@playwright/test").Request[] = [];
    const onRequest = (req: import("@playwright/test").Request) => {
      if (urlPattern.test(req.url())) requests.push(req);
    };
    this.page.on("request", onRequest);
    await action();
    await this.page.waitForTimeout(settleMs);
    this.page.off("request", onRequest);
    return requests;
  }
}
