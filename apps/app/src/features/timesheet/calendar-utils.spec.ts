import { describe, expect, it } from "vitest";
import {
  blockStyle,
  buildDayOccupancySegments,
  clipLogToDay,
  combineDayAndTimeInZone,
  computeLogMoveRange,
  countLogsOnDay,
  dayBoundsFromDateKey,
  fromDateKey,
  isSlotOccupiedElsewhere,
  rangeOccupiedElsewhere,
  resolveDayHeaderTotalSeconds,
  slotIntervalForIndex,
  toDateKey
} from "./calendar-utils";

describe("day header totals", () => {
  it("sums full duration for logs that start on the day", () => {
    const day = combineDayAndTimeInZone("2026-06-15", "12:00", "UTC");
    const logs = [
      {
        startTime: "2026-06-15T09:00:00.000Z",
        endTime: "2026-06-15T10:45:00.000Z",
        durationSec: 6300
      }
    ];

    const total = resolveDayHeaderTotalSeconds(logs, day, "UTC");
    expect(total).toBe(6300);
  });

  it("attributes overnight entries fully to the preference-TZ start day", () => {
    // Wed Jul 8 20:30 – Thu Jul 9 01:30 Asia/Colombo (5h) — same shape as tracker/dashboard 10h Wed.
    const wed = fromDateKey("2026-07-08");
    const thu = fromDateKey("2026-07-09");
    const overnight = {
      startTime: "2026-07-08T15:00:00.000Z",
      endTime: "2026-07-08T20:00:00.000Z",
      durationSec: 18_000
    };
    const sameDay = {
      startTime: "2026-07-08T09:00:00.000Z",
      endTime: "2026-07-08T14:00:00.000Z",
      durationSec: 18_000
    };

    expect(resolveDayHeaderTotalSeconds([overnight, sameDay], wed, "Asia/Colombo")).toBe(36_000);
    expect(resolveDayHeaderTotalSeconds([overnight, sameDay], thu, "Asia/Colombo")).toBe(0);
  });

  it("includes active timer seconds on the day the timer started", () => {
    const day = combineDayAndTimeInZone("2026-06-15", "12:00", "UTC");
    const total = resolveDayHeaderTotalSeconds([], day, "UTC", {
      startedAt: "2026-06-15T09:00:00.000Z",
      isPaused: true,
      elapsedSec: 1800
    });

    expect(total).toBe(1800);
  });

  it("does not add an active timer that started on another calendar day", () => {
    const thu = fromDateKey("2026-07-09");
    const total = resolveDayHeaderTotalSeconds([], thu, "Asia/Colombo", {
      startedAt: "2026-07-08T15:00:00.000Z",
      isPaused: false,
      elapsedSec: 7200,
      liveElapsedSec: 7200
    });
    expect(total).toBe(0);
  });

  it("counts overnight entries on the start day only (header UX)", () => {
    const wed = fromDateKey("2026-07-08");
    const thu = fromDateKey("2026-07-09");
    const overnight = {
      startTime: "2026-07-08T15:00:00.000Z",
      endTime: "2026-07-08T20:00:00.000Z",
      durationSec: 18_000
    };
    expect(countLogsOnDay([overnight], wed, "Asia/Colombo")).toBe(1);
    expect(countLogsOnDay([overnight], thu, "Asia/Colombo")).toBe(0);
  });
});

describe("overnight clip vs start-day totals", () => {
  it("clips visual remnant onto the next day while totals stay on start day", () => {
    const tz = "Asia/Colombo";
    const wed = fromDateKey("2026-07-08");
    const thu = fromDateKey("2026-07-09");
    // Wed 20:30 → Thu 01:30 Colombo
    const overnight = {
      startTime: "2026-07-08T15:00:00.000Z",
      endTime: "2026-07-08T20:00:00.000Z",
      durationSec: 18_000
    };

    const wedClip = clipLogToDay(overnight, wed, tz);
    const thuClip = clipLogToDay(overnight, thu, tz);
    expect(wedClip).not.toBeNull();
    expect(thuClip).not.toBeNull();

    const wedStyle = blockStyle(wedClip!.start, wedClip!.end, tz);
    const thuStyle = blockStyle(thuClip!.start, thuClip!.end, tz);
    expect(wedStyle.display).not.toBe("none");
    expect(thuStyle.display).not.toBe("none");
    expect(parseFloat(wedStyle.height)).toBeGreaterThan(0);
    expect(parseFloat(thuStyle.height)).toBeGreaterThan(0);

    expect(resolveDayHeaderTotalSeconds([overnight], wed, tz)).toBe(18_000);
    expect(resolveDayHeaderTotalSeconds([overnight], thu, tz)).toBe(0);
  });
});

describe("dayBoundsFromDateKey DST-safe end", () => {
  it("ends at next local midnight, not +24h wall clock", () => {
    const { dayStart, dayEnd } = dayBoundsFromDateKey("2026-07-08", "Asia/Colombo");
    expect(dayStart.toISOString()).toBe("2026-07-07T18:30:00.000Z");
    expect(dayEnd.toISOString()).toBe("2026-07-08T18:30:00.000Z");
  });
});

describe("computeLogMoveRange", () => {
  it("shifts by one hour on the same day without drift", () => {
    const log = {
      startTime: "2026-06-08T11:30:00.000Z",
      endTime: "2026-06-08T14:30:00.000Z"
    };
    const anchor = combineDayAndTimeInZone("2026-06-08", "17:00", "Asia/Colombo");
    const preview = combineDayAndTimeInZone("2026-06-08", "18:00", "Asia/Colombo");

    const moved = computeLogMoveRange(log, anchor, preview, "Asia/Colombo");

    expect(moved.start.toISOString()).toBe("2026-06-08T12:30:00.000Z");
    expect(moved.end.toISOString()).toBe("2026-06-08T15:30:00.000Z");
  });

  it("snaps drag targets to the nearest 30-minute slot", () => {
    const log = {
      startTime: "2026-06-08T11:30:00.000Z",
      endTime: "2026-06-08T14:30:00.000Z"
    };
    const anchor = combineDayAndTimeInZone("2026-06-08", "17:00", "Asia/Colombo");
    const preview = combineDayAndTimeInZone("2026-06-08", "18:15", "Asia/Colombo");

    const moved = computeLogMoveRange(log, anchor, preview, "Asia/Colombo");
    const durationMs = moved.end.getTime() - moved.start.getTime();

    expect(durationMs).toBe(3 * 60 * 60 * 1000);
    expect(moved.start.toISOString()).toBe("2026-06-08T13:00:00.000Z");
  });
});

describe("occupancy segments", () => {
  const dateKey = "2026-06-08";

  const occupancy = [
    {
      id: "a",
      startTime: "2026-06-08T09:00:00.000Z",
      endTime: "2026-06-08T10:00:00.000Z",
      workspaceId: "ws-other",
      workspaceName: "Other Co",
      label: "Project — Task"
    },
    {
      id: "b",
      startTime: "2026-06-08T11:00:00.000Z",
      endTime: "2026-06-08T12:00:00.000Z",
      workspaceId: "ws-current",
      workspaceName: "Current",
      label: "Local — Task"
    }
  ];

  it("buildDayOccupancySegments excludes current workspace", () => {
    const segments = buildDayOccupancySegments(dateKey, occupancy, "UTC", "ws-current");
    expect(segments).toHaveLength(1);
    expect(segments[0]?.workspaceId).toBe("ws-other");
  });

  it("isSlotOccupiedElsewhere detects overlap on elsewhere segment", () => {
    const segments = buildDayOccupancySegments(dateKey, occupancy, "UTC", "ws-current");
    const { start, end } = slotIntervalForIndex(dateKey, 18, "UTC");
    const conflict = isSlotOccupiedElsewhere(start, end, segments);
    expect(conflict?.id).toBe("a");
  });

  it("rangeOccupiedElsewhere respects exclude id when moving", () => {
    const segments = buildDayOccupancySegments(dateKey, occupancy, "UTC", "ws-current");
    const conflict = rangeOccupiedElsewhere(dateKey, 18, 18, segments, "UTC", "a");
    expect(conflict).toBeUndefined();
  });

  it("places cross-workspace logs at local wall time, not UTC clock", () => {
    const acmeElsewhere = buildDayOccupancySegments(
      "2026-06-09",
      [
        {
          id: "nw-1",
          startTime: "2026-06-09T15:05:00.000Z",
          endTime: "2026-06-09T18:50:00.000Z",
          workspaceId: "ws-acme",
          workspaceName: "Acme Corporation",
          label: "Client Portal — QA pass"
        }
      ],
      "America/New_York",
      "ws-meridian"
    );
    expect(acmeElsewhere).toHaveLength(1);
    const style = blockStyle(acmeElsewhere[0]!.start, acmeElsewhere[0]!.end, "America/New_York");
    const topPct = parseFloat(style.top);
    expect(topPct).toBeGreaterThan(40);
    expect(topPct).toBeLessThan(55);
  });
});

describe("blockStyle proportional height", () => {
  it("uses true duration for short entries instead of a 20-minute floor", () => {
    const start = combineDayAndTimeInZone("2026-06-08", "09:00", "UTC");
    const end = combineDayAndTimeInZone("2026-06-08", "09:05", "UTC");
    const style = blockStyle(start, end, "UTC");
    const heightPct = parseFloat(style.height);
    expect(heightPct).toBeGreaterThan(0);
    expect(heightPct).toBeLessThan(1);
  });

  it("renders an entry that ends at exact local midnight (20:00–24:00)", () => {
    const tz = "Asia/Colombo";
    const day = fromDateKey("2026-07-08");
    const log = {
      startTime: "2026-07-08T14:30:00.000Z", // 20:00 Colombo
      endTime: "2026-07-08T18:30:00.000Z" // 24:00 / next midnight Colombo
    };
    const clip = clipLogToDay(log, day, tz);
    expect(clip).not.toBeNull();
    const style = blockStyle(clip!.start, clip!.end, tz);
    expect(style.display).not.toBe("none");
    const topPct = parseFloat(style.top);
    const heightPct = parseFloat(style.height);
    // 20:00–24:00 = last 4/24 of the day
    expect(topPct).toBeCloseTo((20 / 24) * 100, 5);
    expect(heightPct).toBeCloseTo((4 / 24) * 100, 5);
  });
});

describe("toDateKey / fromDateKey", () => {
  it("formats local calendar dates as YYYY-MM-DD", () => {
    expect(toDateKey(new Date(2025, 5, 9))).toBe("2025-06-09");
    expect(toDateKey(new Date(2025, 0, 5))).toBe("2025-01-05");
  });

  it("round-trips through fromDateKey at local midnight", () => {
    const key = "2025-06-09";
    const day = fromDateKey(key);
    expect(toDateKey(day)).toBe(key);
    expect(day.getHours()).toBe(0);
    expect(day.getMinutes()).toBe(0);
  });
});
