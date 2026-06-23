import { expect, test } from "@playwright/test";

test("platform superadmin can sign in and see tenant list", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("platform@kloqra.dev");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/tenants/);
  await expect(page.getByRole("heading", { name: "Tenants" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Kloqra Demo Organization" })).toBeVisible();
});
