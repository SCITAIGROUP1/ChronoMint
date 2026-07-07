import { expect, test } from "@playwright/test";

const PENDING_TENANT = {
  id: "00000000-0000-4000-8000-000000000099",
  name: "Provisioned Org",
  slug: "provisioned-org",
  status: "pending_setup",
  settings: {},
  createdAt: new Date().toISOString()
};

test("provisioned owner sees organization setup form", async ({ page }) => {
  await page.route("**/tenants/current", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PENDING_TENANT)
    });
  });

  await page.goto("/account/organization");
  await expect(page.getByRole("heading", { name: "Finish setup" })).toBeVisible({
    timeout: 30_000
  });
  await expect(page.getByLabel("Organization name")).toBeVisible();
  await expect(page.getByLabel("Organization ID")).toBeVisible();
});

test("owner without workspace is redirected to required workspace setup", async ({ page }) => {
  await page.route("**/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "00000000-0000-4000-8000-000000000001", name: "Provisioned Owner" },
        tenantId: PENDING_TENANT.id,
        tenantRole: "OWNER",
        requiresWorkspaceSetup: true
      })
    });
  });

  await page.route("**/tenants/current", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...PENDING_TENANT, status: "active" })
    });
  });

  await page.goto("/account/billing");
  await expect(page).toHaveURL(/\/account\/workspaces\?setup=required/, { timeout: 15_000 });
  await expect(page.getByRole("dialog", { name: /create your first workspace/i })).toBeVisible();
});
