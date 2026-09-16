import { expect, type Page } from "@playwright/test";

/** Wait until app shell finished bootstrapping (not login/context picker/loading). */
export async function waitForAppShell(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
  await expect(page).not.toHaveURL(/\/select-(context|workspace)/, { timeout: 30_000 });
  await expect(page.getByText("Loading workspace…")).toBeHidden({ timeout: 30_000 });
  await expect(page.getByText("Checking your session…")).toHaveCount(0);
  await dismissOnboardingIfOpen(page);
}

/** Sidebar nav in workspace or account mode — avoids duplicate header/profile matches. */
export function appSidebar(page: Page) {
  return page.locator("aside:visible").first();
}

export async function dismissOnboardingIfOpen(page: Page) {
  const skip = page.getByRole("button", { name: "Skip onboarding" });
  // Profile load can open the wizard a beat after shell paint.
  try {
    await skip.waitFor({ state: "visible", timeout: 3_000 });
    await skip.click();
    await skip.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => undefined);
  } catch {
    // Wizard not shown for users who already completed onboarding.
  }
}

export async function expandSidebarIfCollapsed(page: Page) {
  await dismissOnboardingIfOpen(page);
  const expand = page.getByRole("button", { name: "Expand sidebar" });
  if (await expand.isVisible()) {
    await expand.click({ timeout: 2_000 }).catch(() => undefined);
  }
}

export async function clickAppSidebarLink(page: Page, label: string) {
  await expandSidebarIfCollapsed(page);
  await appSidebar(page).getByRole("link", { name: label, exact: true }).click();
}

/** User avatar link in the shell sidebar footer. */
export function appSidebarUserLink(page: Page, name: string | RegExp) {
  return appSidebar(page).getByRole("link", { name });
}

export async function dismissNextDevToolsIfOpen(page: Page) {
  const close = page.getByRole("button", { name: "Close Next.js Dev Tools" });
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  }
}

export async function waitForSettingsPage(page: Page) {
  await waitForAppShell(page);
  await expect(page.getByText("Loading settings…")).toBeHidden({ timeout: 60_000 });
  await expect(page.getByText("Unable to load settings")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible({
    timeout: 60_000
  });
}

export async function waitForProfilePage(page: Page) {
  await waitForAppShell(page);
  await expect(page.getByText("Unable to load profile")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible({ timeout: 60_000 });
}

export async function clickSettingsNavSection(page: Page, label: string) {
  await page
    .getByRole("navigation", { name: "Settings" })
    .getByRole("button", { name: label, exact: true })
    .click();
}

export async function clickAppLogout(page: Page) {
  await dismissNextDevToolsIfOpen(page);
  await expandSidebarIfCollapsed(page);
  const sidebar = appSidebar(page);
  const namedLogout = sidebar.getByRole("button", { name: "Log out" });
  const logout = (await namedLogout.count()) > 0 ? namedLogout : sidebar.getByRole("button").last();
  await logout.scrollIntoViewIfNeeded();
  await logout.click();
  await page.waitForURL(/\/login/, { timeout: 30_000 });
}
