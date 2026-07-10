import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Arrange Grid ("Rearranging Layout" / "Edit Mode") page object.
 *
 * The grid is a standard `react-grid-layout` (`.react-grid-layout > .react-grid-item`,
 * `transform: translate(x,y)` inline styles, `react-draggable` / `react-resizable`
 * classes) — confirmed live by inspecting the DOM directly.
 *
 * IMPORTANT — drag mechanics: the exploratory session (Playwright MCP) could not get a
 * synthetic/simulated drag to register against react-grid-layout at all (see the source
 * exploratory-results.md notes on DM-056/057). This suite's `dragItem()` below is proven
 * to work with a REAL sequence of `page.mouse.move()` → `down()` → several incremental
 * `move()` calls → `up()` (confirmed live during this suite's build: an item's transform
 * genuinely changed from `translate(0,0)` to `translate(388,0)`, pushed sibling widgets,
 * persisted after mouseup, and Cancel correctly reverted it). A single `dragTo()`-style
 * jump or a bare dispatchEvent(...) does NOT work — react-grid-layout's underlying
 * react-draggable needs the intermediate mousemove events to detect and track the drag.
 */
export class ArrangeGridPage {
  readonly page: Page;
  readonly toggleButton: Locator; // "Arrange Grid" / "Done Arranging"
  readonly banner: Locator;
  readonly bannerGuidanceText: Locator;
  readonly cancelButton: Locator;
  readonly resetLayoutButton: Locator;
  readonly saveButton: Locator;
  readonly saveOptionsButton: Locator;
  readonly saveLayoutMenuItem: Locator;
  readonly saveAsDefaultMenuItem: Locator;
  readonly gridItems: Locator;

  constructor(page: Page) {
    this.page = page;
    this.toggleButton = page.getByRole("button", { name: /^(Arrange Grid|Done Arranging)$/ });
    this.banner = page.getByText("Rearranging Layout");
    this.bannerGuidanceText = page.getByText(
      "Drag anywhere on a widget to move; drag edges or the corner to resize."
    );
    this.cancelButton = page.getByRole("button", { name: "Cancel" });
    this.resetLayoutButton = page.getByRole("button", { name: "Reset Layout" });
    this.saveButton = page.getByRole("button", { name: "Save", exact: true });
    this.saveOptionsButton = page.getByRole("button", { name: "Save options" });
    this.saveLayoutMenuItem = page.getByRole("menuitem", { name: "Save layout" });
    this.saveAsDefaultMenuItem = page.getByRole("menuitem", { name: "Save as default" });
    this.gridItems = page.locator(".react-grid-layout > .react-grid-item");
  }

  async isInEditMode(): Promise<boolean> {
    return this.banner.isVisible().catch(() => false);
  }

  async enter() {
    if (!(await this.isInEditMode())) {
      await this.toggleButton.click();
      await expect(this.banner).toBeVisible();
    }
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async resetLayout() {
    await this.resetLayoutButton.click();
    // Confirmed live: the grid re-renders to the reset layout slightly after the click
    // resolves (a brief transition/re-fetch) — wait for the item count to restabilize
    // before any caller reads `getLayoutFingerprint()`, or the read races the reset.
    await this.page.waitForTimeout(300);
    await this.waitForGridReady();
  }

  async openSaveOptions() {
    await this.saveOptionsButton.click();
    await expect(this.saveLayoutMenuItem).toBeVisible();
  }

  async saveLayout() {
    await this.openSaveOptions();
    await this.saveLayoutMenuItem.click();
  }

  async saveAsDefault() {
    await this.openSaveOptions();
    await this.saveAsDefaultMenuItem.click();
  }

  /**
   * Waits until the grid has re-rendered its items (self-healed: a reload or a Reset
   * Layout click needs a real settle window before `.react-grid-item` elements are
   * present/stable — reading the fingerprint too early returns a short-lived empty or
   * partial array). Defaults to the 10-widget `DEFAULT_LAYOUT` count.
   */
  async waitForGridReady(expectedCount = 10) {
    await expect(this.gridItems).toHaveCount(expectedCount, { timeout: 15_000 });
  }

  /** Reads every grid item's inline `style` attribute (position/size fingerprint). */
  async getLayoutFingerprint(): Promise<string[]> {
    return this.gridItems.evaluateAll((els) => els.map((el) => el.getAttribute("style") ?? ""));
  }

  /**
   * Drags grid item at `index` by (`dx`, `dy`) pixels using a real mouse down → many
   * incremental moves → up sequence (see class doc comment for why this matters).
   */
  async dragItem(index: number, dx: number, dy: number, steps = 20) {
    const item = this.gridItems.nth(index);
    const box = await item.boundingBox();
    if (!box) throw new Error(`Grid item at index ${index} has no bounding box (not visible?)`);

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const endX = startX + dx;
    const endY = startY + dy;

    await this.page.mouse.move(startX, startY, { steps: 5 });
    await this.page.mouse.down();
    await this.page.waitForTimeout(50);
    for (let s = 1; s <= steps; s++) {
      const x = startX + ((endX - startX) * s) / steps;
      const y = startY + ((endY - startY) * s) / steps;
      await this.page.mouse.move(x, y);
    }
    await this.page.waitForTimeout(150);
    await this.page.mouse.up();
    await this.page.waitForTimeout(300);
  }
}
