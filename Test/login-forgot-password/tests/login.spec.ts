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

  // LGN-15
  test("empty submit shows client-side validation without calling the API", async ({ page }) => {
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

  // LGN-16
  test("show/hide password toggle switches input type", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.passwordInput.fill("Password1@");
    expect(await login.passwordInputType()).toBe("password");

    await login.togglePasswordVisibility();
    expect(await login.passwordInputType()).toBe("text");
  });

  // LGN-17
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

  // Investigated but NOT reproduced automatically (see exploratory results "Not confirmed"
  // section) — kept as a living regression guard in case it resurfaces, not filed as a defect.
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
