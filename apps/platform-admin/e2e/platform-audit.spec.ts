import { expect, test } from "@playwright/test";

test("platform superadmin can view audit log", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("platform@kloqra.dev");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/tenants/);

  await page.getByRole("link", { name: "Audit log" }).click();
  await expect(page).toHaveURL(/\/audit/);
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();

  await expect(page.getByText("platform.login").first()).toBeVisible({ timeout: 15_000 });
});
