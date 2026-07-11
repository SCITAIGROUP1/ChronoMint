import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { TimerPage } from "../pages/timer.page";

// Group 6 (partial): Pinned Favorites + Recent Activity sidebar widgets (AC-28, AC-29)
// Source: specs_qa/timer-member.md TM-051, 052, 053, 054, 055.
//
// TM-056 (empty recent-activity state) is NOT automated: needs a zero-activity account
// this environment can't produce on demand — see
// specs_qa/timer-member-exploratory-results.md.
//
// Every test that pins a favorite unpins it again before finishing, so the shared QA
// account's Pinned Favorites list is left exactly as it was found (empty), regardless of
// which test ran or in what order.

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";
const PROJECT = "Integritas · Aimswebplus";
const TASK = "Testing";
const TASK_2 = "Meeting";
const CHIP_NAME = "Aimswebplus Testing";
const CHIP_NAME_2 = "Aimswebplus Meeting";

test.describe("Pinned Favorites and Recent Activity", () => {
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

  // TM-054 — Empty-state hint when no favorites pinned (asserted first/independently,
  // before any test in this file pins anything)
  test("Pinned Favorites shows the empty-state hint when nothing is pinned", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await expect(timer.pinnedEmptyText).toBeVisible();
  });

  // TM-052 — Pin control only appears once both Project and Task are selected
  test("Pin button only appears once both Project and Task are selected", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await expect(timer.pinButton).toBeHidden();

    await timer.selectProject(PROJECT);
    await expect(timer.pinButton).toBeHidden();

    await timer.selectTask(TASK);
    await expect(timer.pinButton).toBeVisible();
    await expect(timer.pinButton).toHaveAttribute("title", "Pin current task");
  });

  // TM-051 — Pin/unpin the current project+task
  test("Pinning and unpinning the current task toggles the button and the chip", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await timer.selectProject(PROJECT);
    await timer.selectTask(TASK);

    await timer.togglePin();
    await expect(timer.pinButton).toHaveAttribute("title", "Unpin current task");
    await expect(timer.favoriteChip(CHIP_NAME)).toBeVisible();
    await expect(timer.pinnedEmptyText).toBeHidden();

    await timer.togglePin();
    await expect(timer.pinButton).toHaveAttribute("title", "Pin current task");
    await expect(timer.pinnedEmptyText).toBeVisible();
  });

  // TM-053 — Clicking a pinned-favorite chip re-populates the selectors
  test("Clicking a pinned-favorite chip re-populates the Project/Task selectors", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();
    await timer.selectProject(PROJECT);
    await timer.selectTask(TASK);
    await timer.togglePin(); // pin "Aimswebplus / Testing"

    // Change selection away from the pinned task.
    await timer.selectTask(TASK_2);
    await expect(timer.taskCombobox).toHaveText(TASK_2);

    // Clicking the pinned chip should bring Task back to "Testing".
    await timer.favoriteChip(CHIP_NAME).click();
    await expect(timer.taskCombobox).toHaveText(TASK);
    await expect(timer.startTimerButton).toBeEnabled();

    // Cleanup: unpin so the account returns to its empty-favorites baseline.
    await timer.togglePin();
    await expect(timer.pinnedEmptyText).toBeVisible();
  });

  // TM-055 — Recent Activity shows up to 3 most-frequent tasks, launchable
  test("Recent Activity chips re-populate the selectors and enable Start", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();

    await expect(timer.recentActivityHeading).toBeVisible();
    await expect(timer.recentActivityChip(CHIP_NAME)).toBeVisible();
    await expect(timer.recentActivityChip(CHIP_NAME_2)).toBeVisible();

    await timer.recentActivityChip(CHIP_NAME).click();
    await expect(timer.taskCombobox).toHaveText(TASK);
    await expect(timer.startTimerButton).toBeEnabled();
  });
});
