import { chromium, type FullConfig } from "@playwright/test";
import "dotenv/config";
import { LoginPage } from "./pages/login.page";

/**
 * Logs in ONCE and saves the authenticated session to storageState.json, reused by
 * every test via playwright.config.ts's `use.storageState`. Root cause this fixes:
 * with a fresh login per test (the old beforeEach pattern) across ~50 tests + retries,
 * rapid repeated POST /auth/login calls risk tripping the app's own rate limit
 * (5 requests/60s, per acceptance-criteria-login-forgot-password.md AC-3), which
 * manifested as scattered, seemingly-unrelated failures across multiple spec files
 * (stuck on /login instead of /dashboard, no Project combobox found, etc.) — a
 * test-infrastructure problem, not 12 separate product defects.
 */
export default async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });
  const login = new LoginPage(page);
  await login.login(process.env.TEST_USER_EMAIL ?? "", process.env.TEST_USER_PASSWORD ?? "");
  await page.context().storageState({ path: storageState as string });
  await browser.close();
}
