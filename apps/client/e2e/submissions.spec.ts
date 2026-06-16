import { test, expect } from "@playwright/test";

test.describe("Member Submissions", () => {
  test("navigates to submissions page", async ({ page }) => {
    await page.goto("/submissions");
    await expect(page.getByRole("heading", { name: "Submissions" })).toBeVisible();
    await expect(page.getByText(/submit timesheets for review/i)).toBeVisible();
  });

  test("legacy approvals route redirects to submissions", async ({ page }) => {
    await page.goto("/approvals");
    await expect(page).toHaveURL(/\/submissions/);
  });

  test("shows cards and table view toggle", async ({ page }) => {
    await page.goto("/submissions");
    await expect(page.getByRole("button", { name: "Cards" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Table" })).toBeVisible();
    await page.getByRole("button", { name: "Table" }).click();
    await expect(page).toHaveURL(/view=table/);
    await expect(page.getByRole("columnheader", { name: "Project / period" })).toBeVisible();
  });

  test("timesheet page links to submissions when actionable", async ({ page }) => {
    await page.goto("/timesheet");
    const cta = page.getByRole("link", { name: /ready to submit/i });
    if ((await cta.count()) > 0) {
      await cta.click();
      await expect(page).toHaveURL(/\/submissions/);
    }
  });
});
