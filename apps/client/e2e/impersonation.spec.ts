import { test, expect } from "@playwright/test";

test("admin impersonation redirects to client dashboard", async ({ page }) => {
  page.on("console", (msg) => console.log("BROWSER LOG:", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.error("BROWSER EXCEPTION:", err.stack || err.message));

  // 1. Go to Admin login and authenticate
  await page.goto("http://localhost:3002/login");
  await page.fill("input[type='email']", "admin@chronomint.dev");
  await page.fill("input[type='password']", "password123");
  await page.click("button[type='submit']");

  // 2. Wait for dashboard page after login, then navigate to workspace settings
  await page.waitForURL("**/dashboard");
  await page.goto("http://localhost:3002/workspace");
  await page.waitForURL("**/workspace");
  await page.waitForSelector("text=Members (");

  // 3. Click "View as member" for the first member in the list
  const viewAsMemberBtn = page.getByRole("button", { name: "View as member" }).first();
  await expect(viewAsMemberBtn).toBeVisible();
  await viewAsMemberBtn.click();

  // 4. Wait for it to redirect to the client dashboard
  await page.waitForURL("**/dashboard");
  await page.waitForSelector("text=Total Hours");

  // 5. Verify we are viewing as member (check for presence of impersonation banner or user name)
  await expect(page.locator("text=Viewing workspace as")).toBeVisible();

  // 6. Switch workspace in client app
  const workspaceSwitcher = page.getByRole("combobox").first();
  await expect(workspaceSwitcher).toBeVisible();
  await workspaceSwitcher.click();

  const demoOption = page.getByRole("option", { name: "Demo Workspace" });
  await expect(demoOption).toBeVisible();
  await demoOption.click();

  // 7. Wait for navigation/reload
  await page.waitForURL("**/dashboard");
  await page.waitForSelector("text=Total Hours");

  // 8. Verify that the impersonation banner is still present
  await expect(page.locator("text=Viewing workspace as")).toBeVisible();

  // 9. Save a screenshot to the artifacts folder
  await page.screenshot({
    path: "/Users/chamal/.gemini/antigravity/brain/da4065f8-7ae2-4337-afed-66fb44a607f5/media__impersonation_test.png"
  });
});
