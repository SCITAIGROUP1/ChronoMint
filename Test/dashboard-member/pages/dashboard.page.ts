import { expect, type Locator, type Page, type Request } from "@playwright/test";

/**
 * Main Member Dashboard page object: header, Period/Range filters, Scope filters,
 * KPI cards, Weekly Progress Chart, Project Distribution, Category Split, Quick Timer,
 * Daily Progress, Today's Activity Feed, Team Activities.
 *
 * Every locator here was confirmed live against https://chrono-mint-client.vercel.app/dashboard
 * (peter123@yopmail.com, workspace "Integritas") during this suite's build session — see
 * specs_qa/dashboard-member-exploratory-results.md for the original exploratory pass, and
 * HEALING_LOG.md for anything that needed adjusting after the first automated run.
 */
export class DashboardPage {
  readonly page: Page;

  // Header
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly addWidgetsToggle: Locator; // "Add Widgets" / "Close Catalog"
  readonly arrangeGridToggle: Locator; // "Arrange Grid" / "Done Arranging"
  readonly helpMenuButton: Locator;
  readonly notificationsButton: Locator;
  readonly appearanceButton: Locator;
  readonly settingsLink: Locator;
  readonly profileLink: Locator;
  readonly logoutButton: Locator;

  // Period / Range
  readonly periodGroup: Locator;
  readonly todayButton: Locator;
  readonly thisWeekButton: Locator;
  readonly thisMonthButton: Locator;
  readonly rangeButton: Locator;

  // Scope filters
  readonly scopeFiltersToggle: Locator;
  readonly scopeFiltersHelperText: Locator;
  readonly projectFilterCombobox: Locator;
  readonly categoryFilterCombobox: Locator;
  readonly taskFilterCombobox: Locator; // only appears (aria-label "Task") once a project is selected
  readonly taskFilterPlaceholderText: Locator; // static "Select a project first" text, pre-selection
  readonly clearAllScopeFiltersButton: Locator;

  // KPI cards (heading text is unique EXCEPT for the DM-008 duplicate-label defect,
  // which is exactly why callers need getByRole(...).all()/.count() rather than a
  // single Locator for "Total Hours (Today)")
  readonly activeProjectsHeading: Locator;

  // Widgets
  readonly projectDistributionHeading: Locator;
  readonly categorySplitHeading: Locator;
  readonly quickTimerHeading: Locator;
  readonly dailyProgressHeading: Locator;
  readonly todaysActivityFeedHeading: Locator;
  readonly teamActivitiesHeading: Locator;
  readonly teamActivitiesTable: Locator;

  // Quick Timer
  readonly quickTimerProjectCombobox: Locator;
  readonly quickTimerTaskCombobox: Locator;
  readonly startTrackingButton: Locator;
  readonly activeTrackingNoteInput: Locator;
  readonly pauseButton: Locator;
  readonly stopButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole("heading", { name: "Dashboard", level: 1 });
    this.subtitle = page.getByText("Analyze your weekly progress and customize your widget layout.");
    this.addWidgetsToggle = page.getByRole("button", { name: /^(Add Widgets|Close Catalog)$/ });
    this.arrangeGridToggle = page.getByRole("button", { name: /^(Arrange Grid|Done Arranging)$/ });
    this.helpMenuButton = page.getByRole("button", { name: "Help menu" });
    this.notificationsButton = page.getByRole("button", { name: "Notifications" });
    this.appearanceButton = page.getByRole("button", { name: "Appearance" });
    this.settingsLink = page.getByRole("link", { name: "Settings" });
    // Self-healed: "Peter Sam" also matches the sidebar's "Peter Sam View Profile" link
    // (substring match), causing a strict-mode violation. Scope to <main> (the header
    // avatar link lives there; the sidebar's profile link lives in the <complementary>
    // sidebar) and require an exact accessible-name match.
    this.profileLink = page.getByRole("main").getByRole("link", { name: "Peter Sam", exact: true });
    this.logoutButton = page.getByRole("button", { name: "Log out" });

    this.periodGroup = page.getByRole("group");
    this.todayButton = this.periodGroup.getByRole("button", { name: "Today", exact: true });
    this.thisWeekButton = this.periodGroup.getByRole("button", { name: "This week", exact: true });
    this.thisMonthButton = this.periodGroup.getByRole("button", { name: "This month", exact: true });
    this.rangeButton = page.getByRole("button", { name: "Dashboard date range" });

    this.scopeFiltersToggle = page.getByRole("button", { name: "Scope filters" });
    this.scopeFiltersHelperText = page.getByText("Optional — narrow dashboard widgets");
    // Confirmed live: the scope-filter Project/Category comboboxes carry an aria-label
    // ("Project" / "Category") distinct from the Quick Timer's unlabeled comboboxes.
    this.projectFilterCombobox = page.getByRole("combobox", { name: "Project", exact: true });
    this.categoryFilterCombobox = page.getByRole("combobox", { name: "Category", exact: true });
    this.taskFilterCombobox = page.getByRole("combobox", { name: "Task", exact: true });
    this.taskFilterPlaceholderText = page.getByText("Select a project first");
    this.clearAllScopeFiltersButton = page.getByRole("button", { name: "Clear all" });

    this.activeProjectsHeading = page.getByRole("heading", { name: "Active Projects", exact: true });

    this.projectDistributionHeading = page.getByRole("heading", { name: "Project Distribution", exact: true });
    this.categorySplitHeading = page.getByRole("heading", { name: "Category Split", exact: true });
    this.quickTimerHeading = page.getByRole("heading", { name: "Quick Timer", exact: true });
    this.dailyProgressHeading = page.getByRole("heading", { name: "Daily Progress", exact: true });
    this.todaysActivityFeedHeading = page.getByRole("heading", { name: "Today's Activity Feed", exact: true });
    this.teamActivitiesHeading = page.getByRole("heading", { name: "Team Activities", exact: true });
    this.teamActivitiesTable = page.getByRole("table", { name: "Team activities" });

    this.quickTimerProjectCombobox = this.quickTimerWidget().getByRole("combobox").first();
    this.quickTimerTaskCombobox = this.quickTimerWidget().getByRole("combobox").nth(1);
    this.startTrackingButton = page.getByRole("button", { name: "Start tracking" });
    this.activeTrackingNoteInput = page.getByRole("textbox", { name: "Note (optional)" });
    this.pauseButton = page.getByRole("button", { name: "Pause" });
    this.stopButton = page.getByRole("button", { name: "Stop", exact: true });
  }

  // ---- Navigation -------------------------------------------------------

  /**
   * Self-healed: previously always called `page.goto("/dashboard")` unconditionally.
   * Since every test's `LoginPage.login()` already lands on `/dashboard`, an immediate
   * second `goto()` right after was a genuine (avoidable) full-page reload — confirmed
   * live to trigger a real console error ("Failed to load dashboard layout TypeError:
   * Failed to fetch") by aborting the first load's in-flight `/users/me/dashboard-layout`
   * fetch. A real user never double-navigates like this, so it isn't a product defect —
   * it was this suite's own test-authoring artifact. Now a no-op if already there.
   */
  async goto() {
    if (!this.page.url().includes("/dashboard")) {
      await this.page.goto("/dashboard");
    }
    await expect(this.heading).toBeVisible();
  }

  /**
   * Widget "card" container — the nearest `[data-slot="card"]` ancestor of a widget
   * heading. Confirmed live: every dashboard widget renders as a shadcn/ui `Card`
   * (`data-slot="card"`) wrapping both its `h3` heading and its body content, one level
   * inside the `.react-grid-item` grid cell — see the Arrange Grid DOM inspection notes
   * in HEALING_LOG.md for how this was confirmed.
   */
  private widgetCard(heading: Locator): Locator {
    return heading.locator('xpath=ancestor::*[@data-slot="card"][1]');
  }

  quickTimerWidget(): Locator {
    return this.widgetCard(this.quickTimerHeading);
  }

  /**
   * All headings matching "Total Hours (Today)" exactly. In the healthy case this
   * resolves to exactly one element. DM-008 (new defect) is exactly the case where,
   * after switching Period to "Today", this resolves to TWO identically-labeled cards.
   */
  totalHoursTodayHeadings(): Locator {
    return this.page.getByRole("heading", { name: "Total Hours (Today)", exact: true });
  }

  /** Matches whichever label the second KPI card currently uses: Week or Period. */
  totalHoursWeekOrPeriodHeading(): Locator {
    return this.page.getByRole("heading", { name: /^Total Hours \((Week|Period)\)$/ });
  }

  /** Weekly Progress Chart's own heading varies with period: Weekly Progress Chart /
   * Progress Chart / Today's Progress. */
  weeklyProgressChartHeading(): Locator {
    return this.page.getByRole("heading", { name: /^(Weekly Progress Chart|Progress Chart|Today's Progress)$/ });
  }

  // ---- Period / Range -----------------------------------------------------

  async selectPeriod(period: "Today" | "This week" | "This month") {
    const button = { Today: this.todayButton, "This week": this.thisWeekButton, "This month": this.thisMonthButton }[
      period
    ];
    await button.click();
  }

  async getRangeText(): Promise<string> {
    return (await this.rangeButton.textContent()) ?? "";
  }

  /**
   * Whether a Period button (Today/This week/This month) is the currently active one.
   * Confirmed live: these buttons expose NO `data-state`/`aria-pressed` attribute at
   * all — the only signal is that the active button's class list omits
   * `text-muted-foreground` (inactive buttons have it, the active one doesn't).
   */
  async isPeriodActive(button: Locator): Promise<boolean> {
    const cls = (await button.getAttribute("class")) ?? "";
    return !cls.includes("text-muted-foreground");
  }

  async openRangePicker() {
    await this.rangeButton.click();
    await expect(this.page.getByText("Choose a start and end date for your entries.")).toBeVisible();
  }

  /** Formats a Date as the calendar's day-button accessible name, e.g. "2026-07-15". */
  private static toDayName(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  /**
   * Picks a custom [from, to] range in the "Dashboard date range" calendar dialog.
   * Navigates forward/back months as needed via "Next month"/"Previous month", clicks
   * Clear first (if a previous selection exists), then the two day buttons, then Apply.
   */
  async pickCustomDateRange(from: Date, to: Date) {
    await this.openRangePicker();

    const clearButton = this.page.getByRole("button", { name: "Clear" });
    if (await clearButton.isVisible().catch(() => false)) {
      await clearButton.click();
    }

    await this.clickCalendarDay(from);
    await this.clickCalendarDay(to);

    await this.page.getByRole("button", { name: "Apply" }).click();
  }

  private static readonly MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];

  private async clickCalendarDay(date: Date) {
    const name = DashboardPage.toDayName(date);
    const dayButton = this.page.getByRole("button", { name, exact: true });
    const targetMonthIndex = date.getFullYear() * 12 + date.getMonth();

    // Navigate forward/back until the day button is visible (dialog renders two months
    // at a time; walk forward for future dates, back for past ones).
    let guard = 0;
    while (!(await dayButton.isVisible().catch(() => false)) && guard < 30) {
      const monthHeadingText = await this.page
        .getByRole("dialog")
        .locator("p")
        .filter({ hasText: /^[A-Za-z]+ \d{4}$/ })
        .first()
        .textContent();
      const match = monthHeadingText?.match(/^([A-Za-z]+) (\d{4})$/);
      const monthName = match?.[1] ?? "January";
      const year = Number(match?.[2] ?? new Date().getFullYear());
      const visibleMonthIndex = year * 12 + DashboardPage.MONTH_NAMES.indexOf(monthName);

      if (targetMonthIndex < visibleMonthIndex) {
        await this.page.getByRole("button", { name: "Previous month" }).click();
      } else {
        await this.page.getByRole("button", { name: "Next month" }).click();
      }
      guard++;
    }
    await dayButton.click();
  }

  // ---- Scope filters --------------------------------------------------

  async expandScopeFilters() {
    await this.scopeFiltersToggle.click();
  }

  async selectScopeProject(name: string) {
    await this.selectComboboxOption(this.projectFilterCombobox, name);
  }

  async clearScopeFilters() {
    await this.clearAllScopeFiltersButton.click();
  }

  // ---- Quick Timer ------------------------------------------------------

  private async selectComboboxOption(combobox: Locator, optionName: string) {
    await combobox.click();
    await this.page.getByRole("option", { name: optionName, exact: true }).click();
  }

  async selectQuickTimerProject(name: string) {
    await this.selectComboboxOption(this.quickTimerProjectCombobox, name);
  }

  async selectQuickTimerTask(name: string) {
    await this.selectComboboxOption(this.quickTimerTaskCombobox, name);
  }

  async startQuickTimer(project: string, task: string) {
    await this.selectQuickTimerProject(project);
    await this.selectQuickTimerTask(task);
    await expect(this.startTrackingButton).toBeEnabled();
    await this.startTrackingButton.click();
  }

  async stopQuickTimer(note?: string) {
    if (note) {
      await this.activeTrackingNoteInput.fill(note);
    }
    await this.stopButton.click();
  }

  /**
   * Test-hygiene guard: if a prior test in the same suite failed before reaching its
   * own stopQuickTimer() cleanup, the account is left with a running timer, which then
   * breaks every subsequent Quick Timer test (start flow requires the idle Project/Task
   * state, not "Active Tracking"). Call this in a beforeEach so each test starts clean
   * regardless of what happened before it.
   */
  async ensureTimerStopped() {
    await this.goto();
    if (await this.stopButton.isVisible().catch(() => false)) {
      await this.stopButton.click();
      await expect(this.stopButton).toBeHidden();
    }
  }

  /** Reads the "Today's Activity Feed" widget's visible text content. */
  async activityFeedText(): Promise<string> {
    return (await this.widgetCard(this.todaysActivityFeedHeading).textContent()) ?? "";
  }

  /** Reads the always-today KPI card's value text (first "Total Hours (Today)" match). */
  async totalHoursTodayValueText(): Promise<string> {
    const card = this.widgetCard(this.totalHoursTodayHeadings().first());
    return (await card.textContent()) ?? "";
  }

  /** Deletes every currently-listed entry in Today's Activity Feed whose text matches. */
  async deleteActivityFeedEntriesContaining(text: string) {
    const feed = this.widgetCard(this.todaysActivityFeedHeading);
    // Loop: as long as an entry containing `text` exists, delete the first match's
    // "Delete time entry" button. Re-query each time since the DOM re-renders after delete.
    for (let i = 0; i < 10; i++) {
      const marker = feed.getByText(text, { exact: false }).first();
      if (!(await marker.isVisible().catch(() => false))) break;
      const row = marker.locator("xpath=ancestor::*[.//button[@aria-label='Delete time entry']][1]");
      await row.getByRole("button", { name: "Delete time entry" }).click();
      await this.page.waitForTimeout(300);
    }
  }

  // ---- Network capture helper (mirrors login-forgot-password's pattern) -------------

  /**
   * Runs `action` while recording every request whose URL matches `urlPattern`.
   * Used for the DM-011 range-clamping regression to prove what params were ACTUALLY
   * sent to /timelogs vs. what the user picked in the UI.
   */
  async captureRequests(urlPattern: RegExp, action: () => Promise<void>, settleMs = 2500): Promise<Request[]> {
    const requests: Request[] = [];
    const onRequest = (req: Request) => {
      if (urlPattern.test(req.url())) requests.push(req);
    };
    this.page.on("request", onRequest);
    await action();
    await this.page.waitForTimeout(settleMs);
    this.page.off("request", onRequest);
    return requests;
  }
}
