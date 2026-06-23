import { test, expect } from "@playwright/test";

test("tenant owner sees billing page with upgrade options", async ({ page }) => {
  await page.goto("/account/billing");
  await expect(page.getByRole("heading", { name: /^billing$/i })).toBeVisible({
    timeout: 30_000
  });
  await expect(page.getByTestId("billing-plan-card")).toBeVisible();
  await expect(page.getByTestId("billing-upgrade-starter")).toBeVisible();
  await expect(page.getByTestId("billing-upgrade-pro")).toBeVisible();
});

test("checkout redirect uses mocked API response", async ({ page }) => {
  await page.route("**/tenants/current/subscription/checkout", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ url: "https://checkout.stripe.com/c/pay/cs_test_mock" })
    });
  });

  await page.goto("/account/billing");
  await expect(page.getByTestId("billing-upgrade-starter")).toBeVisible({ timeout: 30_000 });

  await Promise.all([
    page.waitForURL("https://checkout.stripe.com/c/pay/cs_test_mock"),
    page.getByTestId("billing-upgrade-starter").click()
  ]);
});

test("manage subscription button is disabled without stripe customer", async ({ page }) => {
  await page.goto("/account/billing");
  await expect(page.getByTestId("billing-manage-button")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("billing-manage-button")).toBeDisabled();
});
