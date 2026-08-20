import { describe, expect, it } from "vitest";
import {
  DEFAULT_RANGE,
  entriesHaveNoOverlap,
  findOverlapsInBatch,
  listWeekdaysInRange,
  planDayEntries,
  totalHours,
  WEEKDAY_ENTRY_SLOTS
} from "./seed-member-rich-timelogs.util";

describe("seed-member-rich-timelogs.util", () => {
  it("lists weekdays only for Jul–Aug 2026 range", () => {
    const days = listWeekdaysInRange(DEFAULT_RANGE.start, DEFAULT_RANGE.end, "America/New_York");
    expect(days.length).toBeGreaterThan(30);
    expect(days[0]).toEqual({ y: 2026, m: 7, d: 1 }); // Wed
    expect(days.some((d) => d.y === 2026 && d.m === 7 && d.d === 4)).toBe(false); // Sat excluded
    expect(days.some((d) => d.y === 2026 && d.m === 7 && d.d === 3)).toBe(true); // Fri included
    expect(days.some((d) => d.y === 2026 && d.m === 8 && d.d === 20)).toBe(true);
  });

  it("plans at least four non-overlapping entries with 8+ hours per weekday", () => {
    expect(WEEKDAY_ENTRY_SLOTS.length).toBeGreaterThanOrEqual(4);
    const plans = planDayEntries({ y: 2026, m: 7, d: 6 }, "America/New_York");
    expect(plans).toHaveLength(4);
    expect(entriesHaveNoOverlap(plans)).toBe(true);
    expect(totalHours(plans)).toBeGreaterThanOrEqual(8);
  });

  it("findOverlapsInBatch detects crossing intervals", () => {
    const userId = "user-1";
    const overlaps = findOverlapsInBatch([
      {
        userId,
        startTime: new Date("2026-07-06T13:00:00.000Z"),
        endTime: new Date("2026-07-06T15:00:00.000Z")
      },
      {
        userId,
        startTime: new Date("2026-07-06T14:00:00.000Z"),
        endTime: new Date("2026-07-06T16:00:00.000Z")
      }
    ]);
    expect(overlaps.length).toBe(1);
  });
});
