import { describe, expect, it } from "vitest";
import {
  ALL_WEEKDAY_INDEXES,
  filterDaysByVisibleWeekdays,
  parseVisibleWeekdays,
  sameWeekdays,
  serializeVisibleWeekdays,
  toggleVisibleWeekday,
  weekdayCheckboxOrder,
  WORK_WEEKDAY_INDEXES
} from "./timesheet-visible-days";

describe("weekdayCheckboxOrder", () => {
  it("starts Monday when preferred", () => {
    expect(weekdayCheckboxOrder("monday")).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it("starts Sunday when preferred", () => {
    expect(weekdayCheckboxOrder("sunday")).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe("parse/serializeVisibleWeekdays", () => {
  it("round-trips weekday indexes", () => {
    const raw = serializeVisibleWeekdays([1, 2, 3, 4, 5]);
    expect(parseVisibleWeekdays(raw)).toEqual([1, 2, 3, 4, 5]);
  });

  it("returns null for empty or invalid storage", () => {
    expect(parseVisibleWeekdays(null)).toBeNull();
    expect(parseVisibleWeekdays("")).toBeNull();
    expect(parseVisibleWeekdays("not-json")).toBeNull();
    expect(parseVisibleWeekdays("[]")).toBeNull();
  });
});

describe("filterDaysByVisibleWeekdays", () => {
  const week = [
    new Date(2026, 7, 3), // Mon
    new Date(2026, 7, 4),
    new Date(2026, 7, 5),
    new Date(2026, 7, 6),
    new Date(2026, 7, 7),
    new Date(2026, 7, 8), // Sat
    new Date(2026, 7, 9) // Sun
  ];

  it("hides Saturday and Sunday when only weekdays are visible", () => {
    const visible = filterDaysByVisibleWeekdays(week, [1, 2, 3, 4, 5]);
    expect(visible).toHaveLength(5);
    expect(visible.map((d) => d.getDay())).toEqual([1, 2, 3, 4, 5]);
  });

  it("falls back to all days when the filter would empty the grid", () => {
    expect(filterDaysByVisibleWeekdays(week, [])).toEqual(week);
  });
});

describe("toggleVisibleWeekday", () => {
  it("unchecks a day", () => {
    expect(toggleVisibleWeekday(ALL_WEEKDAY_INDEXES, 0, false)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("refuses to uncheck the last remaining day", () => {
    expect(toggleVisibleWeekday([1], 1, false)).toEqual([1]);
  });

  it("checks a day back on", () => {
    expect(toggleVisibleWeekday([1, 2, 3, 4, 5], 6, true)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("sameWeekdays / work week preset", () => {
  it("recognizes the Mon–Fri preset", () => {
    expect(sameWeekdays(WORK_WEEKDAY_INDEXES, [5, 4, 3, 2, 1])).toBe(true);
    expect(sameWeekdays(WORK_WEEKDAY_INDEXES, ALL_WEEKDAY_INDEXES)).toBe(false);
  });
});
