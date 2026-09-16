// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  DashboardFiltersToolbar,
  DASHBOARD_FILTERS_TOOLBAR_CONTENT_CLASS
} from "./dashboard-filters-toolbar";

describe("DashboardFiltersToolbar", () => {
  afterEach(cleanup);

  it("keeps period and scope controls in one compact toolbar row", () => {
    render(
      <DashboardFiltersToolbar
        period={<button type="button">Period</button>}
        scope={<button type="button">Filters</button>}
      />
    );

    const toolbar = screen.getByTestId("dashboard-filters-toolbar");
    const content = toolbar.firstElementChild as HTMLElement | null;
    expect(content?.className).toContain("sm:flex-row");
    expect(content?.className).toBe(DASHBOARD_FILTERS_TOOLBAR_CONTENT_CLASS);
    expect(screen.getByRole("button", { name: "Period" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Filters" })).toBeTruthy();
  });
});
