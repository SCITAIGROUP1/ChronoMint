// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardAppBarActions } from "./dashboard-app-bar-actions";

describe("DashboardAppBarActions", () => {
  afterEach(cleanup);

  it("keeps dashboard data and layout actions in the app bar", () => {
    const onImport = vi.fn();
    const onAddWidgets = vi.fn();
    const onArrange = vi.fn();

    render(
      <DashboardAppBarActions
        canImport
        exportUrl="/exports?from=2026-07-20"
        catalogOpen={false}
        arranging={false}
        onImport={onImport}
        onAddWidgets={onAddWidgets}
        onArrange={onArrange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Import time entries" }));
    fireEvent.click(screen.getByRole("button", { name: "Add widgets" }));
    fireEvent.click(screen.getByRole("button", { name: "Arrange grid" }));

    expect(onImport).toHaveBeenCalledOnce();
    expect(onAddWidgets).toHaveBeenCalledOnce();
    expect(onArrange).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Export this period" }).getAttribute("href")).toBe(
      "/exports?from=2026-07-20"
    );
  });

  it("hides unavailable data actions and exposes active layout states", () => {
    render(
      <DashboardAppBarActions
        canImport={false}
        exportUrl={null}
        catalogOpen
        arranging
        onImport={vi.fn()}
        onAddWidgets={vi.fn()}
        onArrange={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Import time entries" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Export this period" })).toBeNull();
    expect(screen.getByRole("button", { name: "Close widget catalog" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Done arranging" })).toBeTruthy();
  });
});
