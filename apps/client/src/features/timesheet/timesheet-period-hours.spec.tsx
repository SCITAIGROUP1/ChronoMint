/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  formatTimesheetPeriodHours,
  TimesheetPeriodHours,
  timesheetPeriodHoursAriaLabel
} from "./timesheet-period-hours";

afterEach(() => {
  cleanup();
});

describe("TimesheetPeriodHours", () => {
  it("formats empty and logged period totals", () => {
    expect(formatTimesheetPeriodHours(0)).toBe("0h");
    expect(formatTimesheetPeriodHours(6300)).toBe("1h 45m");
    expect(timesheetPeriodHoursAriaLabel(43_200, "week")).toBe("12h logged this week");
  });

  it("renders weekly hours next to the period picker", () => {
    render(<TimesheetPeriodHours totalSec={43_200} view="week" />);
    expect(screen.getByLabelText("12h logged this week").textContent).toBe("12h");
  });
});
