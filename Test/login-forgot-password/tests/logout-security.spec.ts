import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { DashboardPage } from "../pages/dashboard.page";

// LGN-40 — NEW regression test, not part of the original 40-scenario test plan.
//
// Source: specs_qa/login-forgot-password-exploratory-results.md, "Finding 1 — CRITICAL,
// NEW: 'Log out' does not terminate the session server-side" (reproduced 3 times
// independently during exploratory testing on 2026-07-09, and re-confirmed live again
// immediately before this suite was written).
//
// Symptom: clicking "Log out" redirects to /login (looks correct), but navigating back
// to a protected route (e.g. /dashboard) silently re-authenticates via a fresh, successful
// `POST /auth/refresh` — the refresh-token cookie was never actually invalidated
// server-side. The `DELETE /auth/logout` call itself was observed to never resolve in
// 2 of 3 exploratory reproductions.
//
// This is a real, currently-reproducing product defect (confirmed again live during
// automation on 2026-07-09: after logout + navigating to /dashboard, the app remained on
// /dashboard with `POST /auth/refresh -> 201` and `GET /auth/me -> 200`). Per the QA
// workflow's guardrail, this must NOT be self-healed or softened — it is expected to
// FAIL until the underlying server-side logout/refresh-revocation bug is fixed. Leave
// this test red and flag it for defect logging (Step 6).

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";

test.describe("Logout — server-side session termination (security regression)", () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, "TEST_USER_EMAIL / TEST_USER_PASSWORD not configured in .env");

  // LGN-40 — EXPECTED TO FAIL until the real defect (Finding 1) is fixed. Do not soften
  // this assertion or mark it as passing without the underlying behavior actually changing.
  test("[DEFECT][LGN-40] after logout, a protected route must not silently re-authenticate", async ({
    page
  }) => {
    const login = new LoginPage(page);
    const dashboard = new DashboardPage(page);

    await login.goto();
    await login.fillCredentials(TEST_EMAIL, TEST_PASSWORD);
    await login.submit();
    await login.expectLoggedInAsDashboard();

    // Step 2 of the repro: click "Log out". The redirect to /login itself does render
    // correctly (that part is not in question) — see LoginPage.logout().
    await login.logout();
    await expect(page).toHaveURL(/\/login/);

    // Step 3 of the repro: navigate directly to a protected route afterwards. A silent
    // background /auth/refresh is the mechanism the exploratory session observed
    // restoring the session, so give it a real window to fire before asserting.
    let refreshFiredAfterLogout = false;
    page.on("response", (res) => {
      if (res.url().includes("/auth/refresh")) refreshFiredAfterLogout = true;
    });

    await dashboard.goto();
    await page.waitForTimeout(3000);

    expect(
      page.url(),
      "After logout, navigating to a protected route must redirect to /login — it must not " +
        "silently re-authenticate the user. See exploratory-results.md Finding 1: logout leaves " +
        "a refreshable session behind, so a fresh POST /auth/refresh restores the dashboard " +
        `instead of redirecting to /login. (Background /auth/refresh observed this run: ${refreshFiredAfterLogout})`
    ).toMatch(/\/login/);
  });
});
