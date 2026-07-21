import { expect, test } from "@playwright/test";

test.describe("member personal routes in the unified app", () => {
  test("hosts timer, timesheet, and submissions", async ({ page }) => {
    await page.goto("/timer");
    await expect(page.getByRole("heading", { name: "Timer", exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/timer$/);

    await page.goto("/timesheet");
    await expect(page).toHaveURL(/\/timesheet$/);
    await expect(page.getByRole("button", { name: "week", exact: true })).toBeVisible();

    await page.goto("/submissions");
    await expect(page.getByRole("heading", { name: "Submissions", exact: true })).toBeVisible();
    await expect(page.getByText(/submit timesheets for review/i)).toBeVisible();
  });

  test("hosts public team invite handoff", async ({ page }) => {
    await page.route("**/team-invites/invite-token", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          projectName: "Apollo",
          workspaceName: "Acme",
          email: "member@example.com",
          expired: false
        })
      });
    });

    await page.goto("/invite/invite-token");

    await expect(page.getByRole("heading", { name: "Team invite" })).toBeVisible();
    await expect(page.getByText("Apollo")).toBeVisible();
    await expect(page.getByText("Acme")).toBeVisible();
  });
});
