import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Minimal login page object — this suite's entry point onto `/dashboard`. Mirrors the
 * pattern in ../login-forgot-password/pages/login.page.ts (kept independent per-module,
 * per that suite's own convention of not sharing page objects across Test/* modules).
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByRole("textbox", { name: "Email" });
    this.passwordInput = page.getByRole("textbox", { name: "Password" });
    this.signInButton = page.getByRole("button", { name: "Sign in" });
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.goto();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
    await expect(this.page).toHaveURL(/\/dashboard/);
  }
}
