import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { DashboardPage } from "../pages/dashboard.page";

// Covers plan sections 4 (Post-Login Workspace Routing & Workspace Selection) and 5
// (Session & Workspace Context) for the live-walkable scenarios confirmed in
// specs_qa/login-forgot-password-exploratory-results.md — single-workspace-account
// (`peter123@yopmail.com`) coverage only. The multi-workspace scenarios (WKS-02, WKS-03,
// WKS-04, and the full switch action in WKS-05) require a TD-5 account not available in
// this environment and are intentionally NOT automated here (see the test plan's
// "Code-verified only" bucket).

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";

test.describe("Post-login workspace routing", () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, "TEST_USER_EMAIL / TEST_USER_PASSWORD not configured in .env");

  // WKS-01
  test("single-workspace member bypasses Workspace Selection and lands directly on the dashboard", async ({
    page
  }) => {
    const login = new LoginPage(page);
    const dashboard = new DashboardPage(page);

    await login.goto();
    await login.fillCredentials(TEST_EMAIL, TEST_PASSWORD);
    await login.submit();

    await dashboard.expectLandedDirectlyOnDashboard();
  });
});

test.describe("Session & workspace context", () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, "TEST_USER_EMAIL / TEST_USER_PASSWORD not configured in .env");

  // LGN-19
  test("workspace context (name + role) is shown in the sidebar after login", async ({ page }) => {
    const login = new LoginPage(page);
    const dashboard = new DashboardPage(page);

    await login.goto();
    await login.fillCredentials(TEST_EMAIL, TEST_PASSWORD);
    await login.submit();
    await login.expectLoggedInAsDashboard();

    await dashboard.expectWorkspaceContext("Integritas", "Member");
  });

  // LGN-06 — partial, Member side only. Admin-side comparison needs a TD-6 account not
  // available in this environment; not automated (Code-verified only per the test plan).
  test("Member role sees only the expected nav items (no admin-only items)", async ({ page }) => {
    const login = new LoginPage(page);
    const dashboard = new DashboardPage(page);

    await login.goto();
    await login.fillCredentials(TEST_EMAIL, TEST_PASSWORD);
    await login.submit();
    await login.expectLoggedInAsDashboard();

    await dashboard.expectMemberOnlyNav();
  });

  // WKS-05 — partial. Confirms the switcher lives in the left sidebar (not the "top" nav
  // per ticket #562 AC5 — known gap, not a new defect, RQA #562) and opens a "Switch
  // context" listbox. The actual multi-workspace switch action needs a TD-5 account and
  // is not automated here.
  test("workspace switcher (sidebar) opens the Switch context listbox", async ({ page }) => {
    const login = new LoginPage(page);
    const dashboard = new DashboardPage(page);

    await login.goto();
    await login.fillCredentials(TEST_EMAIL, TEST_PASSWORD);
    await login.submit();
    await login.expectLoggedInAsDashboard();

    await dashboard.openWorkspaceSwitcher();
    await dashboard.expectSwitchContextListboxOpen();
    await expect(dashboard.switchContextListbox.getByRole("option", { name: "Integritas Member" })).toBeVisible();
  });
});

test.describe("Protected-route access control", () => {
  // LGN-16 — does not need credentials; this is the unauthenticated-redirect direction.
  test("unauthenticated user navigating directly to a protected route is redirected to /login", async ({
    page
  }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.expectRedirectedToLogin();
  });
});
