import { type Locator, type Page } from "@playwright/test";

export class ForgotPasswordPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly sendResetLinkButton: Locator;
  readonly backToSignInLink: Locator;
  readonly genericConfirmationMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByRole("textbox", { name: "Email" });
    this.sendResetLinkButton = page.getByRole("button", { name: "Send reset link" });
    this.backToSignInLink = page.getByRole("link", { name: "Back to sign in" });
    this.genericConfirmationMessage = page.getByText(
      "If an account exists for that email, we sent a password reset link."
    );
  }

  async goto() {
    await this.page.goto("/forgot-password");
  }

  async requestResetLink(email: string) {
    await this.emailInput.fill(email);
    await Promise.all([
      this.page.waitForResponse((res) => res.url().includes("/auth/forgot-password")),
      this.sendResetLinkButton.click()
    ]);
  }

  async clickBackToSignIn() {
    await this.backToSignInLink.click();
  }
}
