import { type Locator, type Page } from "@playwright/test";

/** Post-login context picker shown when a user has 3+ contexts (org + 2+ workspaces). */
export class SelectContextPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly organizationCard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Choose how you want to work" });
    this.organizationCard = page.getByRole("button", { name: /Organization/ });
  }

  async selectWorkspace(workspaceName: string) {
    await this.page.getByRole("button", { name: new RegExp(workspaceName) }).click();
  }
}
