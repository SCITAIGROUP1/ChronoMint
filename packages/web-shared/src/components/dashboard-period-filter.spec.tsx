import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardPeriodFilter } from "./dashboard-period-filter";

const PRESETS = [
  { value: "today" as const, label: "Today" },
  { value: "week" as const, label: "This week" },
  { value: "month" as const, label: "This month" }
];

describe("DashboardPeriodFilter", () => {
  it("renders presets and the selected date range in a compact toolbar", () => {
    render(
      <DashboardPeriodFilter
        range="week"
        onPresetChange={vi.fn()}
        startDate="2026-06-08"
        endDate="2026-06-12"
        onDateRangeChange={vi.fn()}
        presets={PRESETS}
        dateRangeAriaLabel="Dashboard date range"
      />
    );

    expect(screen.getByRole("group", { name: "Period" })).toBeTruthy();
    expect(screen.queryByText("Range")).toBeNull();
    expect(screen.getByRole("button", { name: "This week" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dashboard date range" }).textContent).toContain(
      "Jun 8"
    );
  });

  it("calls preset handler when a segment is clicked", () => {
    const onPresetChange = vi.fn();

    render(
      <DashboardPeriodFilter
        range="custom"
        onPresetChange={onPresetChange}
        startDate="2026-06-01"
        endDate="2026-06-14"
        onDateRangeChange={vi.fn()}
        presets={PRESETS}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(onPresetChange).toHaveBeenCalledWith("today");
  });

  it("keeps period controls in a flexible container for responsive width", () => {
    const { container } = render(
      <DashboardPeriodFilter
        range="week"
        onPresetChange={vi.fn()}
        startDate="2026-06-08"
        endDate="2026-06-12"
        onDateRangeChange={vi.fn()}
        presets={PRESETS}
      />
    );

    const root = container.firstElementChild as HTMLElement | null;
    expect(root?.className).toContain("@container");
    expect(root?.className).toContain("flex");
  });
});
