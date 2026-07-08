import { test, expect } from "@playwright/test";
import { ForgotPasswordPage } from "../pages/forgot-password.page";
import { ResetPasswordPage } from "../pages/reset-password.page";

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "";

test.describe("Forgot password", () => {
  test.skip(!TEST_EMAIL, "TEST_USER_EMAIL not configured in .env");

  // FPW-01
  test("registered email shows the generic confirmation message", async ({ page }) => {
    const forgotPassword = new ForgotPasswordPage(page);
    await forgotPassword.goto();
    await forgotPassword.requestResetLink(TEST_EMAIL);
    await expect(forgotPassword.genericConfirmationMessage).toBeVisible();
  });

  // FPW-02 — must be identical to FPW-01 (no account enumeration)
  test("unregistered email shows the same generic confirmation message", async ({ page }) => {
    const forgotPassword = new ForgotPasswordPage(page);
    await forgotPassword.goto();
    await forgotPassword.requestResetLink("definitely-not-a-real-user-9182@yopmail.com");
    await expect(forgotPassword.genericConfirmationMessage).toBeVisible();
  });

  // FPW-10
  test("back to sign in link navigates to /login", async ({ page }) => {
    const forgotPassword = new ForgotPasswordPage(page);
    await forgotPassword.goto();
    await forgotPassword.clickBackToSignIn();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Reset password", () => {
  // FPW-05
  test("invalid/expired token is rejected and password is not changed", async ({ page }) => {
    const resetPassword = new ResetPasswordPage(page);
    await resetPassword.goto("invalid-bogus-token-123");
    await resetPassword.fillPasswords("NewPassword1@");

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/auth/reset-password")),
      resetPassword.submit()
    ]);
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toMatch(/invalid or expired/i);
  });

  // FPW-07
  test("weak password is blocked client-side without an API call", async ({ page }) => {
    const resetPassword = new ResetPasswordPage(page);
    await resetPassword.goto("invalid-bogus-token-123");

    let resetCallFired = false;
    page.on("request", (req) => {
      if (req.url().includes("/auth/reset-password")) resetCallFired = true;
    });

    await resetPassword.fillPasswords("weak");
    await expect(resetPassword.weakPasswordHint).toBeVisible();
    await resetPassword.submit();
    await page.waitForTimeout(1000);
    expect(resetCallFired).toBe(false);
  });

  // Baseline: a single, clean click must fire exactly one request (this passes today).
  test("reset via a single click fires exactly one /auth/reset-password request", async ({ page }) => {
    const resetPassword = new ResetPasswordPage(page);
    await resetPassword.goto("invalid-bogus-token-123");
    await resetPassword.fillPasswords("NewPassword1@");
    const requests = await resetPassword.submitAndCaptureResetRequests();
    expect(requests, "A single click should fire exactly one /auth/reset-password request").toHaveLength(1);
  });

  // DEFECT-1 regression guard — same root cause as the login form. EXPECTED TO FAIL until fixed.
  test("[defect regression] Enter-then-click must not double-submit /auth/reset-password", async ({ page }) => {
    const resetPassword = new ResetPasswordPage(page);
    await resetPassword.goto("invalid-bogus-token-123");
    await resetPassword.fillPasswords("NewPassword1@");
    const requests = await resetPassword.submitViaEnterThenClick();
    expect(
      requests,
      "Pressing Enter then clicking Reset password should not fire two separate requests"
    ).toHaveLength(1);
  });
});
