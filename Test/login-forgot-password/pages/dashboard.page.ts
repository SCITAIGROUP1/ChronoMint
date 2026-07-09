import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Member nav items confirmed live (2026-07-09) for the `peter123@yopmail.com` (Member role)
 * account. No billing / project-CRUD / export-wizard admin-only items are present — see
 * exploratory-results.md LGN-06. If this list ever needs to grow, re-verify live first
 * (never guess a selector that wasn't confirmed in the running app).
 */
export const MEMBER_NAV_ITEMS = [
  "Dashboard",
  "Timer",
  "Time Tracker",
  "Timesheet",
  "Submissions",
  "Notifications",
  "My projects"
] as const;

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly logoutButton: Locator;
  readonly profileLink: Locator;
  readonly navigation: Locator;
  /**
   * Sidebar "Workspace" section switcher button. Matched on "Integritas" only (not the
   * full "Integritas Member" string): self-healed 2026-07-09 after a run observed the
   * sidebar rendering collapsed by default (a state that appears persisted per-account on
   * this shared seeded account, independent of this browser session — a "Expand sidebar"
   * button was present instead). Collapsed, the button's accessible name shrinks to just
   * "Integritas" (role text hidden), so requiring the full "Integritas Member" substring
   * made the locator resolve to zero elements intermittently. See HEALING_LOG.md.
   */
  readonly workspaceSwitcherButton: Locator;
  readonly expandSidebarButton: Locator;
  /** Opens as a `listbox` named "Switch context" — confirmed live, WKS-05. */
  readonly switchContextListbox: Locator;
  readonly workspaceSearchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Dashboard" });
    this.logoutButton = page.getByRole("button", { name: "Log out" });
    this.profileLink = page.getByRole("link", { name: /Peter Sam|Profile/ });
    this.navigation = page.getByRole("navigation", { name: "Desktop Navigation" });
    this.workspaceSwitcherButton = page.getByRole("button", { name: "Integritas" });
    this.expandSidebarButton = page.getByRole("button", { name: "Expand sidebar" });
    this.switchContextListbox = page.getByRole("listbox", { name: "Switch context" });
    this.workspaceSearchInput = page.getByRole("textbox", { name: "Search workspaces..." });
  }

  /**
   * Normalizes the sidebar to its expanded state before assertions that need the role
   * text ("Member") visible, so tests don't depend on whichever collapse state this
   * shared account happened to load in.
   */
  async ensureSidebarExpanded() {
    if (await this.expandSidebarButton.isVisible().catch(() => false)) {
      await this.expandSidebarButton.click();
    }
    await expect(this.workspaceSwitcherButton).toBeVisible();
  }

  async goto() {
    await this.page.goto("/dashboard");
  }

  /** WKS-01/LGN-01: confirms a direct landing on /dashboard, no intermediate screen. */
  async expectLandedDirectlyOnDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard/);
    await expect(this.heading).toBeVisible();
  }

  /** LGN-19: sidebar workspace context shows workspace name + role. */
  async expectWorkspaceContext(workspaceName: string, role: string) {
    await this.ensureSidebarExpanded();
    await expect(this.workspaceSwitcherButton).toContainText(workspaceName);
    await expect(this.workspaceSwitcherButton).toContainText(role);
  }

  /**
   * LGN-06 (partial, Member-side only — no TD-6 Admin account available).
   * Confirms exactly the live-confirmed Member nav set is shown (implicitly rules out
   * any admin-only item being present, without guessing labels for items never observed).
   */
  async expectMemberOnlyNav() {
    for (const label of MEMBER_NAV_ITEMS) {
      await expect(this.navigation.getByRole("link", { name: label })).toBeVisible();
    }
    await expect(this.navigation.getByRole("link")).toHaveCount(MEMBER_NAV_ITEMS.length);
  }

  /** WKS-05 (partial): opens the in-sidebar workspace switcher ("Switch context" listbox). */
  async openWorkspaceSwitcher() {
    await expect(this.workspaceSwitcherButton).toBeVisible();
    await this.workspaceSwitcherButton.click();
  }

  async expectSwitchContextListboxOpen() {
    await expect(this.switchContextListbox).toBeVisible();
    await expect(this.workspaceSearchInput).toBeVisible();
  }

  /** LGN-16 / LGN-40: protected-route access without a valid session must redirect to /login. */
  async expectRedirectedToLogin() {
    await expect(this.page).toHaveURL(/\/login/);
  }
}
