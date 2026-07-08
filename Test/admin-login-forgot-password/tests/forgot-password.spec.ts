import { test, expect } from "@playwright/test";
import { ForgotPasswordPage } from "../pages/forgot-password.page";
import { ResetPasswordPage } from "../pages/reset-password.page";

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "";

test.describe("Forgot password (Admin app)", () => {
  test.skip(!TEST_EMAIL, "TEST_USER_EMAIL not configured in .env");

  // ADM-FPW-01
  test("registered email shows the generic confirmation message", async ({ page }) => {
    const forgotPassword = new ForgotPasswordPage(page);
    await forgotPassword.goto();
    await forgotPassword.requestResetLink(TEST_EMAIL);
    await expect(forgotPassword.genericConfirmationMessage).toBeVisible();
  });

  // ADM-FPW-02
  test("unregistered email shows the same generic confirmation message", async ({ page }) => {
    const forgotPassword = new ForgotPasswordPage(page);
    await forgotPassword.goto();
    await forgotPassword.requestResetLink("definitely-not-a-real-admin-9182@yopmail.com");
    await expect(forgotPassword.genericConfirmationMessage).toBeVisible();
  });

  // ADM-FPW-05
  test("back to sign in link navigates to /login", async ({ page }) => {
    const forgotPassword = new ForgotPasswordPage(page);
    await forgotPassword.goto();
    await forgotPassword.clickBackToSignIn();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Reset password (Admin app)", () => {
  // ADM-FPW-03 / DEFECT-ADM-1 regression guard — EXPECTED TO FAIL until fixed.
  test("[defect regression] invalid token shows AC-17 error without a silent-refresh redirect", async ({
    page
  }) => {
    const resetPassword = new ResetPasswordPage(page);
    await resetPassword.goto("invalid-bogus-token-123");
    await resetPassword.fillPasswords("NewPassword1@");

    const refreshRequests = await resetPassword.submitAndCaptureRefreshRequests();

    expect(
      refreshRequests,
      "Submitting an invalid reset token should not trigger a silent /auth/refresh attempt"
    ).toHaveLength(0);
    await expect(
      page,
      "The user should stay on the reset-password page, not get redirected to /login"
    ).toHaveURL(/\/reset-password/);
    await expect(resetPassword.invalidOrExpiredError).toBeVisible();
  });

  // ADM-FPW-04
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

  // Baseline: a single, clean click must fire exactly one request.
  test("reset via a single click fires exactly one /auth/reset-password request", async ({ page }) => {
    const resetPassword = new ResetPasswordPage(page);
    await resetPassword.goto("invalid-bogus-token-456");
    await resetPassword.fillPasswords("NewPassword1@");
    const requests = await resetPassword.submitAndCaptureResetRequests();
    expect(requests, "A single click should fire exactly one /auth/reset-password request").toHaveLength(1);
  });

  // [KAN-8 cross-app check]
  // Note: DEFECT-ADM-1 can redirect this page to /login after the very first (Enter-triggered)
  // submit, before the follow-up click ever happens — that's a *different*, already-filed bug,
  // not this test failing to run. When that happens we can't observe the double-submit signal
  // here at all, so we report it explicitly instead of asserting a misleading pass/fail.
  test("[KAN-8 cross-app check] Enter-then-click must not double-submit /auth/reset-password", async ({
    page
  }) => {
    const resetPassword = new ResetPasswordPage(page);
    await resetPassword.goto("invalid-bogus-token-789");
    await resetPassword.fillPasswords("NewPassword1@");
    const requests = await resetPassword.submitViaEnterThenClick();

    if (page.url().includes("/login")) {
      test.info().annotations.push({
        type: "blocked-by",
        description:
          "DEFECT-ADM-1 redirected away from /reset-password before the follow-up click could fire — " +
          "inconclusive for KAN-8 on this form until DEFECT-ADM-1 is fixed."
      });
      test.skip(true, "Blocked by DEFECT-ADM-1 (redirect pre-empted the second submit)");
      return;
    }

    expect(
      requests,
      "Pressing Enter then clicking Reset password should not fire two separate requests"
    ).toHaveLength(1);
  });
});
