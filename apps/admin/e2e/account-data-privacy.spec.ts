import { test, expect } from "@playwright/test";

const exportJobBase = {
  id: "00000000-0000-4000-8000-000000000101",
  tenantId: "00000000-0000-4000-8000-000000000099",
  requestedByUserId: "00000000-0000-4000-8000-000000000001",
  filename: null,
  contentType: null,
  byteSize: null,
  completedAt: null,
  expiresAt: null
};

test("tenant owner can navigate to data privacy page", async ({ page }) => {
  await page.goto("/account/data-privacy");
  await expect(page).toHaveURL(/\/account\/data-privacy/);
  await expect(page.getByRole("button", { name: /Export all organization data/i })).toBeVisible();
});

test("failed export shows error and allows retry", async ({ page }) => {
  await page.route("**/tenants/current/data-export", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...exportJobBase,
        status: "failed",
        errorMessage: "Failed to queue export task",
        createdAt: new Date().toISOString()
      })
    });
  });

  await page.goto("/account/data-privacy");
  await expect(page.getByText(/Failed to queue export task/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: /Export all organization data/i })).toBeEnabled();
});

test("missing latest export job still allows starting a new export", async ({ page }) => {
  await page.route("**/tenants/current/data-export", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ message: "Export job not found", code: "NOT_FOUND" })
    });
  });

  await page.goto("/account/data-privacy");
  await expect(page.getByRole("button", { name: /Export all organization data/i })).toBeEnabled({
    timeout: 30_000
  });
  await expect(page.getByText(/Export job not found/i)).not.toBeVisible();
});
