// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  DashboardFiltersToolbar,
  DASHBOARD_FILTERS_TOOLBAR_CONTENT_CLASS
} from "./dashboard-filters-toolbar";

describe("DashboardFiltersToolbar", () => {
  afterEach(cleanup);

  it("keeps period and the filter trigger on one stable row", () => {
    render(
      <DashboardFiltersToolbar
        period={<button type="button">Period</button>}
        scope={<button type="button">Filters</button>}
      />
    );

    const toolbar = screen.getByTestId("dashboard-filters-toolbar");
    const content = toolbar.firstElementChild as HTMLElement | null;
    expect(content?.className).toContain("grid-cols-[minmax(0,1fr)_auto]");
    expect(content?.className).toBe(DASHBOARD_FILTERS_TOOLBAR_CONTENT_CLASS);
    expect(screen.getByRole("button", { name: "Period" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Filters" })).toBeTruthy();
  });

  it("lets applied chips span the full toolbar width below the trigger", () => {
    render(
      <DashboardFiltersToolbar
        period={<button type="button">Period</button>}
        scope={
          <>
            <div data-testid="scope-filters-trigger">
              <button type="button">Filters</button>
            </div>
            <div data-testid="scope-filters-applied" className="col-span-full">
              Project Alpha
            </div>
          </>
        }
      />
    );

    const content = screen.getByTestId("dashboard-filters-toolbar")
      .firstElementChild as HTMLElement;
    const applied = screen.getByTestId("scope-filters-applied");
    expect(content.contains(applied)).toBe(true);
    expect(applied.className).toContain("col-span-full");
  });
});
