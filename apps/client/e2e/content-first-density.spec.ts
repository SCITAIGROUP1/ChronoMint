import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";
import { assertNoHorizontalPageOverflow, useCompactLaptopViewport } from "./helpers/overflow";
import { waitForAppShell } from "./helpers/shell";

test.describe("Content-first density", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await useCompactLaptopViewport(page);
  });

  test("1366x768 projects page has one New project CTA and no horizontal overflow", async ({
    page
  }) => {
    await page.goto("/projects");
    await waitForAppShell(page);
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
    await expect(page.getByRole("button", { name: "New project" })).toHaveCount(1);
    await assertNoHorizontalPageOverflow(page);
  });

  test("dashboard customize is the only layout action and Ask Kloqra is not a FAB", async ({
    page
  }) => {
    await page.goto("/dashboard");
    await waitForAppShell(page);
    await expect(page.getByRole("button", { name: "Customize dashboard" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Import time entries" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Open help assistant" })).toHaveCount(0);
    await assertNoHorizontalPageOverflow(page);
  });

  test("1024x768 tablet landscape keeps the desktop sidebar and does not overflow", async ({
    page
  }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/projects");
    await waitForAppShell(page);
    await expect(page.getByTestId("shell-desktop-sidebar")).toBeVisible();
    await expect(page.getByTestId("shell-mobile-header")).toBeHidden();
    await assertNoHorizontalPageOverflow(page);
  });

  test("1280x800 time tracker has one Export action and no wrapping overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/time-tracker");
    await waitForAppShell(page);
    await expect(page.getByRole("heading", { name: "Time Tracker" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Entry" })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Entry type" })).toHaveCount(0);
    await expect(page.getByTestId("app-bar-secondary")).toBeVisible();
    await expect(page.getByRole("form", { name: "Quick add time entry" })).toBeVisible();
    await assertNoHorizontalPageOverflow(page);
  });

  test("timesheet keeps date nav in the app bar and display options in a menu", async ({
    page
  }) => {
    await page.goto("/timesheet");
    await waitForAppShell(page);
    await expect(page.getByRole("heading", { name: "Timesheet" })).toBeVisible();
    await expect(page.getByTestId("timesheet-toolbar")).toBeVisible();
    await expect(page.getByRole("button", { name: "Today" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Display" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Visible weekdays" })).toHaveCount(0);
    await page.getByRole("button", { name: "Display" }).click();
    await expect(page.getByRole("group", { name: "Visible weekdays" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Hide time logged elsewhere" })).toBeVisible();
    await assertNoHorizontalPageOverflow(page);
  });

  test("categories page has a single Add category CTA", async ({ page }) => {
    await page.goto("/categories");
    await waitForAppShell(page);
    await expect(page.getByRole("button", { name: "Add category" })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Bulk import" }).first()).toBeVisible();
    await assertNoHorizontalPageOverflow(page);
  });

  test("core table fills leftover height on team management at 1366x768", async ({ page }) => {
    await page.goto("/team-management");
    await waitForAppShell(page);
    const layout = page.getByTestId("page-layout");
    await expect(layout).toBeVisible();
    await expect(page.getByTestId("page-layout-main")).toBeVisible();
    await expect(page.getByTestId("page-layout-main")).toHaveCSS("overflow-y", "auto");
    await expect(page.getByRole("button", { name: "Add Team Member" })).toHaveCount(1);
    await assertNoHorizontalPageOverflow(page);
  });

  test("list and settings page actions sit at the trailing end of the toolbar", async ({
    page
  }) => {
    const cases = [
      {
        path: "/projects",
        action: { role: "button" as const, name: "New project" },
        cluster: "app-bar-list-actions"
      },
      {
        path: "/categories",
        action: { role: "button" as const, name: "Add category" },
        cluster: "app-bar-list-actions"
      },
      {
        path: "/team-management",
        action: { role: "button" as const, name: "Add Team Member" },
        cluster: "app-bar-list-actions"
      },
      {
        path: "/workspace",
        action: { role: "link" as const, name: "Manage workspaces" },
        cluster: "app-bar-secondary-actions"
      }
    ];

    for (const { path, action, cluster } of cases) {
      await page.goto(path);
      await waitForAppShell(page);
      const clusterEl = page.getByTestId(cluster);
      const cta = page.getByRole(action.role, { name: action.name });
      await expect(cta).toBeVisible();
      await expect(clusterEl).toBeVisible();
      await expect(clusterEl).toContainText(action.name);
      const toolbarBox = await (
        path === "/workspace"
          ? page.getByTestId("app-bar-secondary")
          : page.getByTestId("app-bar-list-toolbar")
      ).boundingBox();
      const ctaBox = await cta.boundingBox();
      expect(toolbarBox).toBeTruthy();
      expect(ctaBox).toBeTruthy();
      expect(ctaBox!.x + ctaBox!.width).toBeGreaterThan(toolbarBox!.x + toolbarBox!.width * 0.65);
      await assertNoHorizontalPageOverflow(page);
    }
  });
});
