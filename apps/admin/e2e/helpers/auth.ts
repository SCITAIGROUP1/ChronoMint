import type { Page } from "@playwright/test";
import { SEED } from "../constants/seed";

const ADMIN_EMAIL = SEED.personas.tenantOwner.email;
const ADMIN_PASSWORD = SEED.personas.tenantOwner.password;
const ACME_WORKSPACE_ADMIN_EMAIL = SEED.personas.acmeAdmin.email;

export async function completePostLoginSelection(
  page: Page,
  workspaceName = SEED.workspaces.acme.name
) {
  // Wait a bit to see which page it lands on
  await page.waitForURL(/.*(select-context|select-workspace|dashboard|account)/, {
    timeout: 30_000
  });

  if (page.url().includes("select-context")) {
    await page.getByRole("button", { name: new RegExp(workspaceName, "i") }).click();
    await page.waitForURL(/.*(select-workspace|dashboard|account)/, { timeout: 30_000 });
  }

  if (page.url().includes("select-workspace")) {
    await page.locator("button").filter({ hasText: workspaceName }).first().click();
    await page.waitForURL(/.*(dashboard|account)/, { timeout: 30_000 });
  }
}

export async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.fill("input[type='email']", ADMIN_EMAIL);
  await page.fill("input[type='password']", ADMIN_PASSWORD);
  await page.click("button[type='submit']");

  await page.waitForURL(/.*(select-context|select-workspace|dashboard|account)/, {
    timeout: 30_000
  });

  await completePostLoginSelection(page);
}

const ORG_ADMIN_EMAIL = SEED.personas.tenantAdmin.email;

export async function loginAsOrganizationAdmin(page: Page) {
  await page.goto("/login");
  await page.fill("input[type='email']", ORG_ADMIN_EMAIL);
  await page.fill("input[type='password']", ADMIN_PASSWORD);
  await page.click("button[type='submit']");

  await page.waitForURL(/.*(select-context|select-workspace|dashboard|account)/, {
    timeout: 30_000
  });

  await completePostLoginSelection(page);
}
export async function loginAsWorkspaceAdmin(page: Page) {
  await page.goto("/login");
  await page.fill("input[type='email']", ACME_WORKSPACE_ADMIN_EMAIL);
  await page.fill("input[type='password']", ADMIN_PASSWORD);
  await page.click("button[type='submit']");

  await page.waitForURL(/.*(select-context|select-workspace|dashboard|account)/, {
    timeout: 30_000
  });

  await completePostLoginSelection(page);
}
