import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Minimal login page object — this suite's entry point onto `/dashboard` (Timer is
 * reached from there via the sidebar "Timer" link, or directly via goto("/timer")).
 * Copied from ../dashboard-member/pages/login.page.ts per that suite's own convention of
 * not sharing page objects across Test/* modules (each module's copy is kept independent).
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
    // Self-healed: Playwright's expect() has its own default 5s poll timeout, separate
    // from the overall 45s test timeout — the post-login redirect to /dashboard
    // occasionally takes longer than 5s, which was causing intermittent failures here
    // (and, since this ran inside global-setup, a suite-wide failure) that looked like
    // a login/rate-limit problem but were actually just this assertion timing out too
    // early. Confirmed live: a manual login succeeded and landed on /dashboard, just
    // slower than 5s.
    await expect(this.page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  }
}
