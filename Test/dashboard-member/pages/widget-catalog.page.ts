import { expect, type Locator, type Page } from "@playwright/test";

/**
 * "Customize Dashboard" slide-over panel (opened via the header's "Add Widgets" /
 * "Close Catalog" toggle). Confirmed live: each widget row is a `div.cursor-pointer`
 * (grandparent of a `[role="switch"]`) containing icon, name, an optional "Active"
 * badge, a description paragraph, a "Min: NxM | Default: NxM" paragraph, and the
 * switch itself. There is no data-testid anywhere in this app, so rows are located by
 * their unique widget name text within that row container — see HEALING_LOG.md if a
 * widget name ever needs disambiguating from KPI-card heading text on the dashboard
 * underneath (the panel is a non-modal overlay, so the grid is still in the DOM).
 */
export class WidgetCatalogPage {
  readonly page: Page;
  readonly panelHeading: Locator;
  readonly panelHeaderText: Locator;
  readonly closePanelButton: Locator;
  readonly closeCatalogBackdrop: Locator;
  readonly filterCategoriesLabel: Locator;
  readonly allWidgetsPill: Locator;
  readonly kpiPill: Locator;
  readonly timePill: Locator;
  readonly compositionPill: Locator;
  readonly quickPill: Locator;
  readonly availableWidgetsCountText: Locator;
  readonly resetLayoutButton: Locator;
  readonly doneEditingButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.panelHeading = page.getByRole("heading", { name: "Customize Dashboard" });
    this.panelHeaderText = page.getByText(
      "Toggle widgets on/off below. Drag anywhere on a widget to reposition it, or drag edges or the corner to resize."
    );
    this.closePanelButton = page.getByRole("button", { name: "Close panel" });
    this.closeCatalogBackdrop = page.getByRole("button", { name: "Close customize panel" });
    this.filterCategoriesLabel = page.getByText("Filter Categories");
    this.allWidgetsPill = page.getByRole("button", { name: "All Widgets" });
    this.kpiPill = page.getByRole("button", { name: "KPI", exact: true });
    this.timePill = page.getByRole("button", { name: "Time", exact: true });
    this.compositionPill = page.getByRole("button", { name: "Composition", exact: true });
    this.quickPill = page.getByRole("button", { name: "Quick", exact: true });
    this.availableWidgetsCountText = page.getByText(/^Available Widgets \(\d+\)$/);
    this.resetLayoutButton = page.getByRole("button", { name: "Reset Layout" });
    this.doneEditingButton = page.getByRole("button", { name: "Done Editing" });
  }

  /**
   * The slide-over panel's own container. Confirmed live: it's a plain
   * `<div class="fixed top-0 right-0 ...">` — the panel is a non-modal overlay (the
   * dashboard grid stays mounted underneath), so widget-row lookups MUST be scoped to
   * this container. Otherwise a widget name like "Total Hours (Today)" or "Quick Timer"
   * would ambiguously match both the catalog row AND the identically-named KPI
   * card/widget heading still visible behind the panel.
   */
  panelContainer(): Locator {
    return this.panelHeading.locator('xpath=ancestor::div[contains(@class,"fixed") and contains(@class,"right-0")][1]');
  }

  async isOpen(): Promise<boolean> {
    return this.panelHeading.isVisible().catch(() => false);
  }

  async close() {
    await this.doneEditingButton.click();
  }

  async filterByCategory(category: "All Widgets" | "KPI" | "Time" | "Composition" | "Quick") {
    const pill = {
      "All Widgets": this.allWidgetsPill,
      KPI: this.kpiPill,
      Time: this.timePill,
      Composition: this.compositionPill,
      Quick: this.quickPill
    }[category];
    await pill.click();
  }

  async getAvailableWidgetsCount(): Promise<number> {
    const text = await this.availableWidgetsCountText.textContent();
    const match = text?.match(/\((\d+)\)/);
    return match ? Number(match[1]) : NaN;
  }

  /**
   * The widget's row container: nearest ancestor (within the panel) of its name text
   * that also owns a switch. Scoped to `panelContainer()` — see the comment there for
   * why this scoping is required (many widget names collide with dashboard headings).
   *
   * Uses `exact: false` deliberately: confirmed live, the name and its "Active" badge
   * share one div with no whitespace between them (e.g. textContent is literally
   * "Total Hours (Today)Active"), so `exact: true` matches zero elements. Substring
   * matching plus the xpath walk-up to the nearest switch-owning ancestor still
   * resolves to exactly one row per widget name across all 14 widgets.
   */
  widgetRow(name: string): Locator {
    return this.panelContainer()
      .getByText(name, { exact: false })
      .first()
      .locator('xpath=ancestor::*[.//*[@role="switch"]][1]');
  }

  widgetSwitch(name: string): Locator {
    return this.widgetRow(name).getByRole("switch");
  }

  async isWidgetActive(name: string): Promise<boolean> {
    const row = this.widgetRow(name);
    return row.getByText("Active", { exact: true }).isVisible().catch(() => false);
  }

  async isWidgetSwitchOn(name: string): Promise<boolean> {
    const state = await this.widgetSwitch(name).getAttribute("aria-checked");
    return state === "true";
  }

  async toggleWidget(name: string) {
    await this.widgetSwitch(name).click();
  }
}
