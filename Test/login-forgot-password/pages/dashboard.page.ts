import { type Locator, type Page } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly logoutButton: Locator;
  readonly profileLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Dashboard" });
    this.logoutButton = page.getByRole("button", { name: "Log out" });
    this.profileLink = page.getByRole("link", { name: /Peter Sam|Profile/ });
  }
}
