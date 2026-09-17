import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";
import { assertNoHorizontalPageOverflow, usePhoneViewport } from "./helpers/overflow";
import { waitForAppShell } from "./helpers/shell";

test.describe("Compact admin UX", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await usePhoneViewport(page);
  });

  test("team management uses one header, filter sheet, and does not overflow", async ({ page }) => {
    await page.goto("/team-management");
    await waitForAppShell(page);

    const mobileHeader = page.getByTestId("shell-mobile-header");
    await expect(mobileHeader).toBeVisible();
    await expect(mobileHeader.getByRole("heading", { name: "Team Management" })).toBeVisible();
    await expect(page.getByTestId("shell-desktop-sidebar")).toBeHidden();
    await expect(page.getByRole("button", { name: "Filters" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Team Member" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Member" })).toBeVisible();

    await page.getByRole("button", { name: "Filters" }).click();
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Filter by status" })).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();

    await assertNoHorizontalPageOverflow(page);
  });

  test("approvals folds filters into a sheet and does not overflow", async ({ page }) => {
    await page.goto("/approvals");
    await waitForAppShell(page);

    await expect(
      page.getByTestId("shell-mobile-header").getByRole("heading", { name: "Approvals" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Filters" })).toBeVisible();

    await page.getByRole("button", { name: "Filters" }).click();
    const dialog = page.getByRole("dialog", { name: "Filters" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Project", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();

    await assertNoHorizontalPageOverflow(page);
  });
});
