import { expect, test } from "@playwright/test";

test("superadmin can open create tenant form", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("platform@kloqra.dev");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/tenants/);
  await page.getByRole("link", { name: "Create tenant" }).first().click();
  await expect(page).toHaveURL(/\/tenants\/new/);
  await expect(page.getByRole("heading", { name: "Create tenant" })).toBeVisible();
  await expect(page.getByLabel("Organization name")).toBeVisible();
});
