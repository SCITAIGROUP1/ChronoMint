import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { TimerPage } from "../pages/timer.page";

// Group 5 (mechanism only) + Group 7: polling and workspace-scoping headers
// Source: specs_qa/timer-member.md TM-044, TM-059.
//
// TM-036–TM-043 (stale-timer dialog, hard auto-stop) and TM-060–TM-063 (cross-workspace,
// window-focus refetch, own-data-only) are NOT automated here: all need test data/
// preconditions this environment can't produce (an 8+ hour idle window, a second
// workspace membership, a second admin session, or are inherently unfalsifiable from a
// single-account session) — see specs_qa/timer-member-exploratory-results.md.

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";
const PROJECT = "Integritas · Aimswebplus";
const TASK = "Testing";

test.describe("Cross-cutting / non-functional", () => {
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

  // TM-044 — Client polls GET /timer/active on mount and after every start/pause/resume/
  // stop action (exact ~30s cadence is code-verified only per the exploratory pass; this
  // test asserts the observable mechanism, not the precise interval)
  test("GET /timer/active fires on mount and after every timer action", async ({ page }) => {
    const timer = new TimerPage(page);

    const mountRequests = await timer.captureRequests(/\/timer\/active/, async () => {
      await timer.goto();
    });
    expect(mountRequests.length).toBeGreaterThan(0);

    const startRequests = await timer.captureRequests(/\/timer\/active/, async () => {
      await timer.startTimer(PROJECT, TASK);
    });
    expect(startRequests.length).toBeGreaterThan(0);

    const stopRequests = await timer.captureRequests(/\/timer\/active/, async () => {
      await timer.stopSaveButton.click();
    });
    expect(stopRequests.length).toBeGreaterThan(0);
  });

  // TM-059 — All timer actions carry workspace-scoping headers
  test("Timer requests carry x-auth-scope and x-workspace-id headers", async ({ page }) => {
    const timer = new TimerPage(page);
    await timer.goto();

    const requests = await timer.captureRequests(/\/timer\/(start|active)/, async () => {
      await timer.startTimer(PROJECT, TASK);
    });
    expect(requests.length).toBeGreaterThan(0);

    for (const req of requests) {
      const headers = req.headers();
      expect(headers["x-auth-scope"]).toBe("client");
      expect(headers["x-workspace-id"]).toBeTruthy();
    }

    await timer.stopSaveButton.click();
  });
});
