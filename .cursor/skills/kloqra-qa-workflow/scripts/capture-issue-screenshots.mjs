#!/usr/bin/env node
/**
 * Capture QA evidence screenshots for known issues (Playwright).
 * Usage: node capture-issue-screenshots.mjs <issue#>
 * Requires: client on http://localhost:3000, API on :3001
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../../..");
const require = createRequire(path.join(ROOT, "apps/client/package.json"));
const { chromium } = require("@playwright/test");
const BASE_URL = process.env.QA_BASE_URL ?? "http://localhost:3000";
const MEMBER = "member@kloqra.dev";
const PASSWORD = "password123";

const issueNum = process.argv[2];
if (issueNum !== "199") {
  console.error("Screenshot capture implemented for GH-199 only (export). Issue:", issueNum);
  process.exit(1);
}

const outDir = path.join(ROOT, ".qa-evidence", "GH-199", "screenshots");
fs.mkdirSync(outDir, { recursive: true });

async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill("input[type='email']", MEMBER);
  await page.fill("input[type='password']", PASSWORD);
  await page.click("button[type='submit']");
  await page.waitForURL(/\/(dashboard|timer|timesheet|time-tracker)/, { timeout: 30_000 });
}

async function dismissOnboarding(page) {
  const skip = page.getByRole("button", { name: /skip|got it|dismiss/i });
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skip.click();
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

try {
  await login(page);
  await page.goto(`${BASE_URL}/timesheet`);
  await dismissOnboarding(page);
  await page.getByRole("heading", { name: /export my timesheet/i }).waitFor({ timeout: 15_000 });

  // AC-1 — export UI before click
  await page.screenshot({ path: path.join(outDir, "GH-199-AC-1-export-ui.png") });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = await downloadPromise;
  const csvPath = path.join(outDir, "GH-199-AC-1-export-download.csv");
  await download.saveAs(csvPath);
  console.log("AC-1:", path.join(outDir, "GH-199-AC-1-export-ui.png"), "+ CSV");

  // AC-2 — empty range toast
  await page.locator("#export-from").fill("2099-01-01");
  await page.locator("#export-to").fill("2099-01-07");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByText(/no entries to export/i).waitFor({ timeout: 10_000 });
  await page.screenshot({ path: path.join(outDir, "GH-199-AC-2-empty-toast.png") });
  console.log("AC-2:", path.join(outDir, "GH-199-AC-2-empty-toast.png"));

  await context.close();

  // AC-3 — unauthenticated redirect
  const anon = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const guest = await anon.newPage();
  await guest.goto(`${BASE_URL}/timesheet`);
  await guest.waitForURL(/\/login/, { timeout: 15_000 });
  await guest.screenshot({ path: path.join(outDir, "GH-199-AC-3-login-redirect.png") });
  console.log("AC-3:", path.join(outDir, "GH-199-AC-3-login-redirect.png"));
  await anon.close();
} finally {
  await browser.close();
}

console.log("\nScreenshots saved to:", outDir);
