// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardAppBarActions } from "./dashboard-app-bar-actions";

describe("DashboardAppBarActions", () => {
  afterEach(cleanup);

  it("exposes a single Customize control instead of import, export, add, and arrange", () => {
    const onCustomize = vi.fn();

    render(<DashboardAppBarActions customizing={false} onCustomize={onCustomize} />);

    expect(screen.queryByRole("button", { name: "Import time entries" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Export this period" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add widgets" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Customize dashboard" }));
    expect(onCustomize).toHaveBeenCalledOnce();
  });

  it("shows a done state while customizing", () => {
    render(<DashboardAppBarActions customizing onCustomize={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Done customizing" })).toBeTruthy();
  });
});
