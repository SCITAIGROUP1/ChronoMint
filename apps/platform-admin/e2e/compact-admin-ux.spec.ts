import { expect, test } from "@playwright/test";
import { loginPlatformAdmin } from "./helpers/platform-auth";

const PHONE_VIEWPORT = { width: 390, height: 844 } as const;

test.describe("Compact platform UX", () => {
  test("tenants list uses a filter sheet and does not overflow on a phone", async ({ page }) => {
    await loginPlatformAdmin(page);
    await page.setViewportSize(PHONE_VIEWPORT);
    await page.goto("/tenants");

    const mobileHeader = page.getByTestId("shell-mobile-header");
    await expect(mobileHeader).toBeVisible();
    await expect(mobileHeader.getByRole("heading", { name: "Tenants" })).toBeVisible();
    await expect(page.getByTestId("shell-desktop-sidebar")).toBeHidden();
    await expect(page.getByRole("button", { name: "Filters" })).toBeVisible();

    await page.getByRole("button", { name: "Filters" }).click();
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Filter by status" })).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 1;
    });
    expect(overflow).toBe(false);
  });
});
