import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { DashboardPage } from "../pages/dashboard.page";

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";

test.describe("Login", () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, "TEST_USER_EMAIL / TEST_USER_PASSWORD not configured in .env");

  // LGN-01
  test("successful login with valid credentials redirects to dashboard", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.fillCredentials(TEST_EMAIL, TEST_PASSWORD);
    await login.submit();
    await login.expectLoggedInAsDashboard();

    const dashboard = new DashboardPage(page);
    await expect(dashboard.heading).toBeVisible();

    await login.logout();
  });

  // LGN-02
  test("wrong password shows a generic invalid-credentials error", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.fillCredentials(TEST_EMAIL, "WrongPassword1@");
    await login.submit();
    await expect(login.invalidCredentialsError).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  // LGN-03 — must show the exact same message as LGN-02 (no account enumeration)
  test("unknown email shows the same generic error as a wrong password", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.fillCredentials("definitely-not-a-real-user-9182@yopmail.com", "AnyPassword1@");
    await login.submit();
    await expect(login.invalidCredentialsError).toBeVisible();
  });

  // LGN-12 — known gap, not a new defect: button reads "Sign in" (not "Login"), field
  // is named "Email" (not "Email Address"). Reproduced live 2026-07-09, RQA #561.
  test("login screen presents expected fields and controls", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(login.emailInput).toBeVisible();
    await expect(login.passwordInput).toBeVisible();
    await expect(login.signInButton).toBeVisible();
    await expect(login.forgotPasswordLink).toBeVisible();
  });

  // LGN-13 (renumbered from the pre-expansion plan's LGN-15) — known gap, not a new
  // defect: wording is "Email/Password is required", not the literal "This field is
  // required". Validation itself works correctly. Reproduced live 2026-07-09, RQA #561.
  test("required-field validation on empty submit", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    let loginCallFired = false;
    page.on("request", (req) => {
      if (req.url().includes("/auth/login")) loginCallFired = true;
    });

    await login.submit();
    await expect(login.emailRequiredError).toBeVisible();
    await expect(login.passwordRequiredError).toBeVisible();
    expect(loginCallFired).toBe(false);
  });

  // LGN-14
  test("partial empty submit shows only the blank field's required error", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    let loginCallFired = false;
    page.on("request", (req) => {
      if (req.url().includes("/auth/login")) loginCallFired = true;
    });

    await login.emailInput.fill(TEST_EMAIL || "someone@example.com");
    await login.submit();
    await expect(login.passwordRequiredError).toBeVisible();
    await expect(login.emailRequiredError).not.toBeVisible();
    expect(loginCallFired).toBe(false);
  });

  // LGN-17 (renumbered from the pre-expansion plan's LGN-16)
  test("show/hide password toggle switches input type", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.passwordInput.fill("Password1@");
    expect(await login.passwordInputType()).toBe("password");

    await login.togglePasswordVisibility();
    expect(await login.passwordInputType()).toBe("text");
  });

  // LGN-18 (renumbered from the pre-expansion plan's LGN-17)
  test("forgot password link navigates to /forgot-password", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.clickForgotPassword();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  // Baseline: a single, clean click must fire exactly one request (this passes today).
  test("sign-in via a single click fires exactly one /auth/login request", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.fillCredentials(TEST_EMAIL, "WrongPassword1@");
    const requests = await login.submitAndCaptureLoginRequests();
    expect(requests, "A single click should fire exactly one /auth/login request").toHaveLength(1);
  });

  // DEFECT-1 regression guard — the real repro: Enter-to-submit followed by a click
  // both go through, because the button/form doesn't guard against a second submit
  // while the first is in flight/just completed. EXPECTED TO FAIL until fixed.
  test("[defect regression] Enter-then-click must not double-submit /auth/login", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.fillCredentials(TEST_EMAIL, "WrongPassword1@");
    const requests = await login.submitViaEnterThenClick();
    expect(
      requests,
      "Pressing Enter then clicking Sign in should not fire two separate /auth/login requests"
    ).toHaveLength(1);
  });

  // Client-side-only check: confirms the scoped localStorage tokens are cleared on logout.
  // This alone is NOT sufficient evidence the session is dead server-side — see the
  // Finding 1 regression in tests/logout-security.spec.ts (LGN-40), which proved a
  // protected route still silently re-authenticates via a cookie-based /auth/refresh
  // even when these localStorage keys are correctly cleared. Kept as-is; still accurate.
  test("logout clears client access/refresh tokens from localStorage", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.fillCredentials(TEST_EMAIL, TEST_PASSWORD);
    await login.submit();
    await login.expectLoggedInAsDashboard();

    const beforeLogout = await login.readClientAuthStorage();
    expect(beforeLogout.accessToken, "access token should be set after login").toBeTruthy();

    await login.logout();

    const afterLogout = await login.readClientAuthStorage();
    expect(afterLogout.accessToken, "access token must be cleared after logout").toBeNull();
    expect(afterLogout.refreshToken, "refresh token must be cleared after logout").toBeNull();
  });
});
