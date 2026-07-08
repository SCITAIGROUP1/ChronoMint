import { type Locator, type Page, type Request } from "@playwright/test";

export class ResetPasswordPage {
  readonly page: Page;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly resetPasswordButton: Locator;
  readonly weakPasswordHint: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newPasswordInput = page.getByRole("textbox", { name: "New password" });
    this.confirmPasswordInput = page.getByRole("textbox", { name: "Confirm password" });
    this.resetPasswordButton = page.getByRole("button", { name: "Reset password" });
    this.weakPasswordHint = page.getByText("Weak", { exact: true });
  }

  async goto(token: string) {
    await this.page.goto(`/reset-password?token=${encodeURIComponent(token)}`);
  }

  async fillPasswords(newPassword: string, confirmPassword = newPassword) {
    await this.newPasswordInput.fill(newPassword);
    await this.confirmPasswordInput.fill(confirmPassword);
  }

  /**
   * Submits and returns every /auth/reset-password request fired within the
   * settle window. Used to assert exactly one request per submit (DEFECT-1 regression guard).
   */
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

  async submit() {
    await this.resetPasswordButton.click();
  }

  /**
   * Reproduces DEFECT-1 on this form: pressing Enter in the confirm-password field
   * submits, and a follow-up click on "Reset password" submits again.
   */
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
    await this.resetPasswordButton.click({ force: true });
    await this.page.waitForTimeout(settleMs);
    this.page.off("request", onRequest);
    return requests;
  }
}
