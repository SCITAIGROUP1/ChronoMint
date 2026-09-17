/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TimesheetLegend } from "./timesheet-legend";
import { TimesheetToolbar } from "./timesheet-toolbar";
import { ALL_WEEKDAY_INDEXES, WORK_WEEKDAY_INDEXES } from "./timesheet-visible-days";

afterEach(cleanup);

const weekdayOrder = [1, 2, 3, 4, 5, 6, 0] as const;

const toolbarProps = {
  view: "week" as const,
  anchor: new Date(2026, 8, 15),
  rangeLabel: "09/13/2026 – 09/19/2026",
  weekStartPref: "monday" as const,
  periodTotalSec: 0,
  visibleWeekdays: [...ALL_WEEKDAY_INDEXES],
  weekdayOrder: [...weekdayOrder],
  onWeekdaysPreset: vi.fn(),
  onVisibleWeekdayChange: vi.fn(),
  showOccupancyOverlay: true,
  onToggleOccupancy: vi.fn(),
  onToday: vi.fn(),
  onPrev: vi.fn(),
  onNext: vi.fn(),
  onAnchorChange: vi.fn(),
  onViewChange: vi.fn()
};

describe("TimesheetToolbar", () => {
  it("keeps date navigation visible and hides weekday chips until Display opens", () => {
    render(<TimesheetToolbar {...toolbarProps} />);

    expect(screen.getByTestId("timesheet-toolbar")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Today" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Timesheet view" })).toBeTruthy();
    expect(screen.getByTestId("app-bar-secondary-actions").className).toContain("ml-auto");
    expect(screen.getByRole("button", { name: "Previous week" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Jump to week" })).toBeTruthy();
    expect(screen.getByLabelText("0h logged this week")).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Visible weekdays" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Hide occupied" })).toBeNull();

    fireEvent.click(screen.getByTestId("timesheet-display-trigger"));

    expect(screen.getByTestId("timesheet-display-menu")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Visible weekdays" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hide time logged elsewhere" })).toBeTruthy();
  });

  it("badges Display when weekdays are filtered", () => {
    render(<TimesheetToolbar {...toolbarProps} visibleWeekdays={[...WORK_WEEKDAY_INDEXES]} />);

    expect(screen.getByRole("button", { name: "Display, 1 active" })).toBeTruthy();
  });

  it("hides Display in month view and keeps the view switcher at the end", () => {
    render(<TimesheetToolbar {...toolbarProps} view="month" />);

    expect(screen.getByRole("button", { name: "Today" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Timesheet view" })).toBeTruthy();
    expect(screen.queryByTestId("timesheet-display-trigger")).toBeNull();
  });
});

describe("TimesheetLegend", () => {
  it("shows occupancy only when the overlay is on", () => {
    const { rerender } = render(<TimesheetLegend showOccupancy />);
    expect(screen.getByTestId("timesheet-legend").textContent).toContain("Busy elsewhere");

    rerender(<TimesheetLegend showOccupancy={false} />);
    expect(screen.getByTestId("timesheet-legend").textContent).not.toContain("Busy elsewhere");
    expect(screen.getByTestId("timesheet-legend").textContent).toContain("Locked");
  });

  it("shows the live timer chip when requested", () => {
    render(<TimesheetLegend showOccupancy showLiveTimer />);
    expect(screen.getByText("Live timer")).toBeTruthy();
  });
});
