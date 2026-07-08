import { type Locator, type Page, type Request } from "@playwright/test";

export class ResetPasswordPage {
  readonly page: Page;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly resetPasswordButton: Locator;
  readonly weakPasswordHint: Locator;
  readonly invalidOrExpiredError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newPasswordInput = page.getByRole("textbox", { name: "New password" });
    this.confirmPasswordInput = page.getByRole("textbox", { name: "Confirm password" });
    this.resetPasswordButton = page.getByRole("button", { name: "Reset password" });
    this.weakPasswordHint = page.getByText("Weak", { exact: true });
    this.invalidOrExpiredError = page.getByText(/invalid or expired/i);
  }

  async goto(token: string) {
    await this.page.goto(`/reset-password?token=${encodeURIComponent(token)}`);
  }

  async fillPasswords(newPassword: string, confirmPassword = newPassword) {
    await this.newPasswordInput.fill(newPassword);
    await this.confirmPasswordInput.fill(confirmPassword);
  }

  async submit() {
    await this.resetPasswordButton.click();
  }

  async submitAndCaptureResetRequests(settleMs = 8000): Promise<Request[]> {
    const requests: Request[] = [];
    const onRequest = (req: Request) => {
      if (req.url().includes("/auth/reset-password") && req.method() === "POST") {
        requests.push(req);
      }
    };
    this.page.on("request", onRequest);
    await this.resetPasswordButton.click();
    await this.page.waitForTimeout(settleMs);
    this.page.off("request", onRequest);
    return requests;
  }

  /** Reproduces KAN-8 on this form. */
  async submitViaEnterThenClick(settleMs = 8000): Promise<Request[]> {
    const requests: Request[] = [];
    const onRequest = (req: Request) => {
      if (req.url().includes("/auth/reset-password") && req.method() === "POST") {
        requests.push(req);
      }
    };
    this.page.on("request", onRequest);
    await this.confirmPasswordInput.press("Enter");
    await this.page.waitForTimeout(1500);
    // DEFECT-ADM-1 can navigate this page away (to /login) before the follow-up click —
    // don't let that surface as an unrelated timeout; only click if the button is still there.
    if (await this.resetPasswordButton.isVisible().catch(() => false)) {
      await this.resetPasswordButton.click({ force: true });
    }
    await this.page.waitForTimeout(settleMs);
    this.page.off("request", onRequest);
    return requests;
  }

  /**
   * Submits and captures every /auth/refresh request fired afterward — used to prove
   * DEFECT-ADM-1 (an invalid-token 401 should NOT trigger a silent refresh attempt).
   */
  async submitAndCaptureRefreshRequests(settleMs = 6000): Promise<Request[]> {
    const requests: Request[] = [];
    const onRequest = (req: Request) => {
      if (req.url().includes("/auth/refresh") && req.method() === "POST") {
        requests.push(req);
      }
    };
    this.page.on("request", onRequest);
    await this.resetPasswordButton.click();
    await this.page.waitForTimeout(settleMs);
    this.page.off("request", onRequest);
    return requests;
  }
}
