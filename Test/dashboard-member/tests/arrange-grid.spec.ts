import { test, expect, type Browser } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { DashboardPage } from "../pages/dashboard.page";
import { ArrangeGridPage } from "../pages/arrange-grid.page";

// Group 6d/6e: Arrange Grid mode (AC-26), Layout persistence per workspace (AC-27)
// Source: specs_qa/dashboard-member.md DM-055–DM-057, DM-059–DM-061
//
// This is the one area where the exploratory session (Playwright MCP, Step 3) could NOT
// get a simulated drag to register against react-grid-layout at all (see
// specs_qa/dashboard-member-exploratory-results.md, DM-056/057 "Not verified" rows) — a
// tooling limitation, not a product defect. This suite's ArrangeGridPage.dragItem() uses
// a REAL page.mouse.move()/down()/move()×N/up() sequence, proven live during this
// suite's build to genuinely move a grid item (`translate(0,0)` -> `translate(388,0)`,
// pushing siblings, surviving mouseup, and correctly reverting on Cancel) — see
// HEALING_LOG.md for the full verification notes. DM-058/DM-062/DM-063 are NOT automated
// here: they need a second Member account/workspace, unavailable in this environment.
//
// Self-healed (Run 1 -> Run 2, see HEALING_LOG.md): tests in this file save/reset the
// shared QA account's REAL per-member layout. Run 1 had a test fail mid-assertion before
// its own cleanup ran, which left the saved layout dirty for the next test in the same
// file ("before" no longer matched the true default). Fixed with (1) a `beforeAll` that
// forces the account back to `DEFAULT_LAYOUT` and saves it once, so every test's "before"
// snapshot is trustworthy, and (2) an `afterEach` that unconditionally resets+saves again,
// so one test's failure can never contaminate the next.

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";

async function resetAndSaveDefaultLayout(browser: Browser) {
  const page = await browser.newPage();
  const login = new LoginPage(page);
  const dashboard = new DashboardPage(page);
  const arrangeGrid = new ArrangeGridPage(page);
  await login.login(TEST_EMAIL, TEST_PASSWORD);
  await dashboard.goto();
  await arrangeGrid.enter();
  await arrangeGrid.resetLayout();
  await arrangeGrid.saveLayout();
  await page.waitForTimeout(500);
  await page.close();
}

test.describe("Arrange Grid mode", () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, "TEST_USER_EMAIL / TEST_USER_PASSWORD not configured in .env");

  test.beforeAll(async ({ browser }) => {
    await resetAndSaveDefaultLayout(browser);
  });

  test.afterEach(async ({ browser }) => {
    // Unconditional cleanup so a failed assertion mid-test can never leave the shared
    // QA account's saved layout in a dragged/non-default state for the next test.
    await resetAndSaveDefaultLayout(browser);
  });

  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(TEST_EMAIL, TEST_PASSWORD);
    await new DashboardPage(page).ensureTimerStopped();
  });

  // DM-055 — Arrange Grid activates edit mode with a sticky toolbar
  test("Arrange Grid activates edit mode with the Rearranging Layout banner", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const arrangeGrid = new ArrangeGridPage(page);
    await dashboard.goto();

    await arrangeGrid.enter();
    await expect(page.getByRole("button", { name: "Done Arranging" })).toBeVisible();
    await expect(arrangeGrid.banner).toBeVisible();
    await expect(page.getByText("Edit Mode")).toBeVisible();
    await expect(arrangeGrid.bannerGuidanceText).toBeVisible();

    await arrangeGrid.cancel();
    await expect(page.getByRole("button", { name: "Arrange Grid" })).toBeVisible();
  });

  // DM-060 — Toolbar buttons vs. ticket's literal 4-button spec: known gap #733,
  // already filed. Documents current, accepted reality (Cancel, Reset Layout, combined
  // Save + Save-options dropdown; no standalone "Done" button) — do not re-file.
  test("[known gap #733] toolbar has Cancel/Reset/Save/Save-options, no standalone Done button", async ({
    page
  }) => {
    const dashboard = new DashboardPage(page);
    const arrangeGrid = new ArrangeGridPage(page);
    await dashboard.goto();
    await arrangeGrid.enter();

    await expect(arrangeGrid.cancelButton).toBeVisible();
    await expect(arrangeGrid.resetLayoutButton).toBeVisible();
    await expect(arrangeGrid.saveButton).toBeVisible();
    await expect(arrangeGrid.saveOptionsButton).toBeVisible();
    await expect(page.getByRole("button", { name: "Done", exact: true })).toHaveCount(0);

    await arrangeGrid.openSaveOptions();
    await expect(arrangeGrid.saveLayoutMenuItem).toBeVisible();
    await expect(arrangeGrid.saveAsDefaultMenuItem).toBeVisible();
    const menuItemCount = await page.getByRole("menuitem").count();
    expect(menuItemCount).toBe(2);

    // Self-healed: pressing Escape here dismissed the ENTIRE Arrange Grid edit mode
    // (not just the Save-options dropdown), so the subsequent Cancel-button click timed
    // out waiting for an element that no longer existed. Close the dropdown by clicking
    // the sticky banner text instead (a safe outside-click target that stays within edit
    // mode), then Cancel as normal.
    await arrangeGrid.banner.click();
    await arrangeGrid.cancel();
  });

  // DM-056 — Cancel discards in-progress changes. This is ALSO the proof that this
  // suite's automated drag mechanic genuinely works (real mouse move/down/move.../up),
  // not just that the toolbar renders — the fingerprint MUST change after the drag and
  // MUST revert after Cancel.
  test("Real drag moves a widget; Cancel discards the change (proves drag automation works)", async ({
    page
  }) => {
    const dashboard = new DashboardPage(page);
    const arrangeGrid = new ArrangeGridPage(page);
    await dashboard.goto();
    await arrangeGrid.waitForGridReady();
    await arrangeGrid.enter();

    const before = await arrangeGrid.getLayoutFingerprint();
    await arrangeGrid.dragItem(0, 400, 0);
    const afterDrag = await arrangeGrid.getLayoutFingerprint();

    expect(afterDrag[0], "dragging must change the first widget's transform").not.toBe(before[0]);

    await arrangeGrid.cancel();
    await dashboard.goto(); // re-navigate to confirm the discard is real, not just in-memory-pending
    await arrangeGrid.waitForGridReady();
    const afterCancel = await arrangeGrid.getLayoutFingerprint();
    expect(afterCancel).toEqual(before);
  });

  // DM-057 / DM-061 — "Save layout" persists per-member and survives a reload/new
  // session.
  test("Save layout persists a real drag across reload", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const arrangeGrid = new ArrangeGridPage(page);
    await dashboard.goto();
    await arrangeGrid.waitForGridReady();
    await arrangeGrid.enter();

    const before = await arrangeGrid.getLayoutFingerprint();
    await arrangeGrid.dragItem(0, 400, 0);
    const afterDrag = await arrangeGrid.getLayoutFingerprint();
    expect(afterDrag[0]).not.toBe(before[0]);

    await arrangeGrid.saveLayout();
    await page.waitForTimeout(500);

    // Self-healed: reading the fingerprint immediately after reload raced the grid's
    // re-render (items array was momentarily shorter/empty) — wait for the expected
    // item count first.
    await page.reload();
    await expect(dashboard.heading).toBeVisible();
    await arrangeGrid.waitForGridReady();
    const afterReload = await arrangeGrid.getLayoutFingerprint();
    expect(afterReload[0], "the saved drag must survive a full page reload").toBe(afterDrag[0]);
    expect(afterReload[0], "the saved layout must differ from the pre-drag layout").not.toBe(before[0]);
  });

  // DM-059 — Reset Layout (in Arrange mode) reverts to the workspace default
  test("Reset Layout (in Arrange mode) reverts a dragged widget back to the default position", async ({
    page
  }) => {
    const dashboard = new DashboardPage(page);
    const arrangeGrid = new ArrangeGridPage(page);
    await dashboard.goto();
    await arrangeGrid.waitForGridReady();
    await arrangeGrid.enter();

    const before = await arrangeGrid.getLayoutFingerprint();
    await arrangeGrid.dragItem(0, 400, 0);
    expect((await arrangeGrid.getLayoutFingerprint())[0]).not.toBe(before[0]);

    await arrangeGrid.resetLayout();
    const afterReset = await arrangeGrid.getLayoutFingerprint();
    expect(afterReset[0]).toBe(before[0]);

    await arrangeGrid.cancel();
  });
});
