import { expect, type Locator, type Page, type Request } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly showPasswordButton: Locator;
  readonly signInButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly emailRequiredError: Locator;
  readonly passwordRequiredError: Locator;
  readonly invalidCredentialsError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByRole("textbox", { name: "Email" });
    this.passwordInput = page.getByRole("textbox", { name: "Password" });
    this.showPasswordButton = page.getByRole("button", { name: "Show password" });
    this.signInButton = page.getByRole("button", { name: "Sign in" });
    this.forgotPasswordLink = page.getByRole("link", { name: "Forgot password?" });
    this.emailRequiredError = page.getByText("Email is required");
    this.passwordRequiredError = page.getByText("Password is required");
    this.invalidCredentialsError = page.getByText("Invalid email or password. Please try again.");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async fillCredentials(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  /**
   * Submits the form and returns every /auth/login request fired within the
   * settle window. Used to assert exactly one request per submit.
   */
  async submitAndCaptureLoginRequests(settleMs = 8000): Promise<Request[]> {
    const requests: Request[] = [];
    const onRequest = (req: Request) => {
      if (req.url().includes("/auth/login") && req.method() === "POST") {
        requests.push(req);
      }
    };
    this.page.on("request", onRequest);
    await this.signInButton.click();
    await this.page.waitForTimeout(settleMs);
    this.page.off("request", onRequest);
    return requests;
  }

  /**
   * Reproduces DEFECT-1: pressing Enter in the password field submits the form;
   * a follow-up click on "Sign in" (e.g. an impatient user, or slow network) submits
   * again because the button/form does not guard against a second submit while the
   * first request is in flight/just completed.
   */
  async submitViaEnterThenClick(settleMs = 8000): Promise<Request[]> {
    const requests: Request[] = [];
    const onRequest = (req: Request) => {
      if (req.url().includes("/auth/login") && req.method() === "POST") {
        requests.push(req);
      }
    };
    this.page.on("request", onRequest);
    await this.passwordInput.press("Enter");
    await this.page.waitForTimeout(1500);
    await this.signInButton.click({ force: true });
    await this.page.waitForTimeout(settleMs);
    this.page.off("request", onRequest);
    return requests;
  }

  async submit() {
    await this.signInButton.click();
  }

  async togglePasswordVisibility() {
    await this.showPasswordButton.click();
  }

  async passwordInputType(): Promise<string | null> {
    return this.passwordInput.getAttribute("type");
  }

  async expectLoggedInAsDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard/);
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  async logout() {
    await this.page.getByRole("button", { name: "Log out" }).click();
    await expect(this.page).toHaveURL(/\/login/);
  }

  /** Reads the scoped client tokens directly from localStorage. */
  async readClientAuthStorage(): Promise<Record<string, string | null>> {
    return this.page.evaluate(() => ({
      accessToken: localStorage.getItem("cm-client-access-token"),
      refreshToken: localStorage.getItem("cm-client-refresh-token"),
      workspaceId: localStorage.getItem("cm-client-workspace-id")
    }));
  }
}
