import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { SelectContextPage } from "../pages/select-context.page";

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";
const TEST_WORKSPACE = process.env.TEST_WORKSPACE_NAME ?? "";

test.describe("Login (Admin app)", () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, "TEST_USER_EMAIL / TEST_USER_PASSWORD not configured in .env");

  // ADM-LGN-01, ADM-LGN-02
  test("successful login redirects to context picker, then to the selected workspace dashboard", async ({
    page
  }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.fillCredentials(TEST_EMAIL, TEST_PASSWORD);
    await login.submit();

    await expect(page).toHaveURL(/\/select-context/);
    const selectContext = new SelectContextPage(page);
    await expect(selectContext.heading).toBeVisible();

    await selectContext.selectWorkspace(TEST_WORKSPACE);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("link", { name: "Team Management" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Hourly rates" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Exports" })).toBeVisible();

    await login.logout();
  });

  // ADM-LGN-03
  test("wrong password shows a generic invalid-credentials error, no redirect", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.fillCredentials(TEST_EMAIL, "WrongPassword1@");
    await login.submit();
    await expect(login.invalidCredentialsError).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  // ADM-LGN-04
  test("unknown email shows the same generic error as a wrong password", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.fillCredentials("definitely-not-a-real-admin-9182@yopmail.com", "AnyPassword1@");
    await login.submit();
    await expect(login.invalidCredentialsError).toBeVisible();
  });

  // ADM-LGN-08
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

  // ADM-LGN-09
  test("show/hide password toggle switches input type", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.passwordInput.fill("Password1@");
    expect(await login.passwordInputType()).toBe("password");

    await login.togglePasswordVisibility();
    expect(await login.passwordInputType()).toBe("text");
  });

  // ADM-LGN-10
  test("forgot password link navigates to /forgot-password", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.clickForgotPassword();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  // Baseline: a single, clean click must fire exactly one request (expected to pass).
  test("sign-in via a single click fires exactly one /auth/login request", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.fillCredentials(TEST_EMAIL, "WrongPassword1@");
    const requests = await login.submitAndCaptureLoginRequests();
    expect(requests, "A single click should fire exactly one /auth/login request").toHaveLength(1);
  });

  // ADM-LGN-11 [defect regression] — verifies whether KAN-8 also affects the admin app.
  test("[KAN-8 cross-app check] Enter-then-click must not double-submit /auth/login", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.fillCredentials(TEST_EMAIL, "WrongPassword1@");
    const requests = await login.submitViaEnterThenClick();
    expect(
      requests,
      "Pressing Enter then clicking Sign in should not fire two separate /auth/login requests"
    ).toHaveLength(1);
  });
});
