import { test, expect } from "@playwright/test";

test("admin login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /admin sign in/i })).toBeVisible();
});

test("shows friendly message for invalid credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@kloqra.dev");
  await page.getByRole("textbox", { name: "Password" }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.screenshot({
    path: "/Users/chamal/.gemini/antigravity/brain/2dd05935-ac24-44a1-9c3f-0e9ca318d4a5/login_screenshot.png"
  });
  await expect(page.getByText("Invalid email or password. Please try again.")).toBeVisible();
});
