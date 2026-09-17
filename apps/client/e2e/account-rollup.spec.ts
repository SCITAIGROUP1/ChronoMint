import { test, expect } from "@playwright/test";

test("tenant owner sees organization rollup on account overview", async ({ page }) => {
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: /organization summary/i })).toBeVisible({
    timeout: 30_000
  });

  await expect(page.getByText("Total hours")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Billable amount")).toBeVisible();
  await expect(page.getByText("Active members")).toBeVisible();
  await expect(page.getByText("Active workspaces")).toBeVisible();
  await expect(page.getByRole("heading", { name: /hours by workspace/i })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /search workspaces/i })).toBeVisible();
  await expect(page.getByRole("combobox", { name: /filter workspaces/i })).toBeVisible();
  await expect(page.getByRole("combobox", { name: /sort workspaces/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /utilization date range/i })).toBeVisible();

  const plan = page.getByText("ACTIVE");
  const workspaces = page.getByText("In your organization");
  const planBox = await plan.boundingBox();
  const workspacesBox = await workspaces.boundingBox();
  expect(planBox).toBeTruthy();
  expect(workspacesBox).toBeTruthy();
  expect(Math.abs((planBox?.y ?? 0) - (workspacesBox?.y ?? 0))).toBeLessThan(32);
  expect(workspacesBox?.x ?? 0).toBeGreaterThan(planBox?.x ?? 0);
});
