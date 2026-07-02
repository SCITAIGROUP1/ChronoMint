import { test, expect } from "@playwright/test";
import { SEED } from "./constants/seed";

test.describe("Admin context picker", () => {
  test("owner with multiple workspaces lands on select-context after login", async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type='email']", SEED.personas.tenantOwner.email);
    await page.fill("input[type='password']", SEED.personas.tenantOwner.password);
    await page.click("button[type='submit']");

    await expect(page).toHaveURL(/select-context/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Choose how you want to work" })).toBeVisible();
    await expect(page.getByText("Organization · Owner")).toBeVisible();
    await expect(page.getByText(SEED.workspaces.meridian.name)).toBeVisible();
  });

  test("owner can choose organization context from picker", async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type='email']", SEED.personas.tenantOwner.email);
    await page.fill("input[type='password']", SEED.personas.tenantOwner.password);
    await page.click("button[type='submit']");
    await expect(page).toHaveURL(/select-context/, { timeout: 30_000 });

    const tenantNameRegex = new RegExp(SEED.tenant.name, "i");
    await page.getByRole("button", { name: tenantNameRegex }).click();
    await expect(page).toHaveURL(/\/account/, { timeout: 15_000 });
    await expect(page.getByRole("navigation", { name: "Current context" })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Current context" }).getByText("Organization", {
        exact: true
      })
    ).toBeVisible();
  });

  test("owner can choose workspace context from picker", async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type='email']", SEED.personas.tenantOwner.email);
    await page.fill("input[type='password']", SEED.personas.tenantOwner.password);
    await page.click("button[type='submit']");
    await expect(page).toHaveURL(/select-context/, { timeout: 30_000 });

    const acmeNameRegex = new RegExp(SEED.workspaces.acme.name, "i");
    await page.getByRole("button", { name: acmeNameRegex }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.getByRole("navigation", { name: "Current context" })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Current context" }).getByText("Owner · Workspace admin")
    ).toBeVisible();
  });
});
