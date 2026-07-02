import { test as setup } from "@playwright/test";
import { SEED } from "./constants/seed";

const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL ?? "http://localhost:3002";
const AUTH_FILE = "e2e/.auth/admin.json";

setup("authenticate as admin", async ({ page }) => {
  await page.goto(`${ADMIN_BASE_URL}/login`);
  await page.fill("input[type='email']", SEED.personas.tenantOwner.email);
  await page.fill("input[type='password']", SEED.personas.tenantOwner.password);
  await page.click("button[type='submit']");

  await page.waitForURL(/.*(select-context|select-workspace|dashboard|account)/, {
    timeout: 30_000
  });

  if (page.url().includes("select-context")) {
    const searchContext = SEED.tenant.name.split(" ")[0];
    await page.locator("button").filter({ hasText: searchContext }).first().click();
    await page.waitForURL(/.*(select-workspace|dashboard|account)/, { timeout: 30_000 });
  }

  if (page.url().includes("select-workspace")) {
    await page.locator("button").filter({ hasText: SEED.workspaces.acme.name }).first().click();
    await page.waitForURL("**/dashboard", { timeout: 30_000 });
  }

  await page.context().storageState({ path: AUTH_FILE });
});
