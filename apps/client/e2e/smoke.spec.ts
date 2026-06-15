import { test, expect } from "@playwright/test";

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
});

test("AC-3: unauthenticated /timesheet redirects to login", async ({ page }) => {
  await page.goto("/timesheet");
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
});
