import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 45_000,
  globalSetup: "./global-setup.ts",
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.APP_BASE_URL ?? "https://chrono-mint-client.vercel.app",
    storageState: "storageState.json",
    trace: "retain-on-failure",
    screenshot: "on",
    video: "retain-on-failure",
    viewport: { width: 1366, height: 768 }
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
