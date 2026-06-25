import type { TimeLogDto } from "@kloqra/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fromDateKey, todayInZone, toDateKeyInZone } from "../timesheet/calendar-utils";
import {
  buildWeekDayTabs,
  buildWeekGroupsForRange,
  defaultActiveDayKey,
  formatDayTabLabel,
  formatHoursCompact,
  formatHoursDecimal,
  formatWeekSectionLabel,
  formatWeekTotals,
  groupLogsByDay,
  groupLogsByWeek,
  type DayLogGroup
} from "./group-logs-by-week";

function log(
  partial: Partial<TimeLogDto> & Pick<TimeLogDto, "startTime" | "durationSec">
): TimeLogDto {
  return {
    id: partial.id ?? "log-1",
    userId: "user-1",
    taskId: partial.taskId ?? "task-1",
    startTime: partial.startTime,
    endTime: partial.endTime ?? partial.startTime,
    durationSec: partial.durationSec,
    description: partial.description ?? null,
    isBillable: partial.isBillable ?? true,
    source: partial.source ?? "manual"
  };
}

describe("groupLogsByWeek", () => {
  it("groups logs by monday week start and sorts newest week first", () => {
    const groups = groupLogsByWeek(
      [
        log({ id: "a", startTime: "2026-06-10T10:00:00.000Z", durationSec: 3600 }),
        log({
          id: "b",
          startTime: "2026-06-03T10:00:00.000Z",
          durationSec: 7200,
          isBillable: false
        }),
        log({ id: "c", startTime: "2026-06-11T10:00:00.000Z", durationSec: 1800 })
      ],
      "UTC",
      "monday"
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]?.logs.map((l) => l.id)).toEqual(["c", "a"]);
    expect(groups[0]?.totalSec).toBe(5400);
    expect(groups[0]?.billableSec).toBe(5400);
    expect(groups[1]?.logs.map((l) => l.id)).toEqual(["b"]);
    expect(groups[1]?.totalSec).toBe(7200);
    expect(groups[1]?.billableSec).toBe(0);
  });

  it("respects sunday week start preference", () => {
    const groups = groupLogsByWeek(
      [log({ startTime: "2026-06-07T12:00:00.000Z", durationSec: 3600 })],
      "UTC",
      "sunday"
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.weekKey).toBe("2026-06-07");
  });
});

describe("buildWeekGroupsForRange", () => {
  it("returns empty week shells for each week in the selected range", () => {
    const groups = buildWeekGroupsForRange("2026-06-01", "2026-06-14", [], "UTC", "monday");

    expect(groups).toHaveLength(2);
    expect(groups[0]?.weekKey).toBe("2026-06-08");
    expect(groups[1]?.weekKey).toBe("2026-06-01");
    expect(groups.every((group) => group.logs.length === 0)).toBe(true);
  });

  it("merges log totals into weeks that overlap the range", () => {
    const groups = buildWeekGroupsForRange(
      "2026-06-01",
      "2026-06-14",
      [log({ id: "a", startTime: "2026-06-10T10:00:00.000Z", durationSec: 3600 })],
      "UTC",
      "monday"
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]?.logs.map((entry) => entry.id)).toEqual(["a"]);
    expect(groups[1]?.logs).toEqual([]);
  });
});

describe("defaultActiveDayKey", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function day(dayKey: string, logs: TimeLogDto[] = []): DayLogGroup {
    const dayDate = fromDateKey(dayKey);
    return {
      day: dayDate,
      dayKey,
      dayLabel: formatDayTabLabel(dayDate, "UTC"),
      dateLabel: dayKey,
      logs,
      totalSec: logs.reduce((sum, entry) => sum + entry.durationSec, 0)
    };
  }

  it("selects today when it is in the week", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-25T15:00:00.000Z"));
    const todayKey = toDateKeyInZone(todayInZone("UTC"), "UTC");

    const days = [
      day("2026-06-22"),
      day("2026-06-23"),
      day("2026-06-24"),
      day(todayKey, [log({ startTime: "2026-06-25T10:00:00.000Z", durationSec: 1800 })]),
      day("2026-06-26"),
      day("2026-06-27"),
      day("2026-06-28")
    ];

    expect(defaultActiveDayKey(days, "UTC")).toBe(todayKey);
  });

  it("falls back to the last day with entries when today is outside the week", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-25T12:00:00.000Z"));

    const days = [
      day("2026-06-01", [log({ startTime: "2026-06-01T10:00:00.000Z", durationSec: 3600 })]),
      day("2026-06-02"),
      day("2026-06-03", [log({ startTime: "2026-06-03T10:00:00.000Z", durationSec: 1800 })])
    ];

    expect(defaultActiveDayKey(days, "UTC")).toBe("2026-06-03");
  });
});

describe("format helpers", () => {
  it("formats week section label", () => {
    const label = formatWeekSectionLabel(new Date(Date.UTC(2026, 5, 15)), "UTC");
    expect(label).toBe("Week of June 15 to 21");
  });

  it("formats compact hours", () => {
    expect(formatHoursCompact(0)).toBe("0h");
    expect(formatHoursCompact(3600)).toBe("1h");
    expect(formatHoursCompact(5400)).toBe("1.5h");
  });

  it("formats week totals string", () => {
    expect(formatWeekTotals(28800, 25200)).toBe("Total: 8.00h · Billable: 7.00h");
  });

  it("formats decimal hours", () => {
    expect(formatHoursDecimal(0)).toBe("0.00");
    expect(formatHoursDecimal(3600)).toBe("1.00");
    expect(formatHoursDecimal(5400)).toBe("1.50");
    expect(formatHoursDecimal(27000)).toBe("7.50");
  });

  it("formats day tab label", () => {
    const label = formatDayTabLabel(new Date(Date.UTC(2026, 5, 9)), "UTC");
    expect(label).toBe("Tue");
  });
});

describe("buildWeekDayTabs", () => {
  it("includes all seven days in range with zero-hour placeholders", () => {
    const weekStart = new Date(Date.UTC(2026, 5, 15));
    const days = buildWeekDayTabs(
      weekStart,
      [log({ id: "a", startTime: "2026-06-16T10:00:00.000Z", durationSec: 3600 })],
      "UTC",
      "monday",
      "2026-06-15",
      "2026-06-21"
    );

    expect(days).toHaveLength(7);
    expect(days[0]?.dayKey).toBe("2026-06-15");
    expect(days[0]?.totalSec).toBe(0);
    expect(days[1]?.totalSec).toBe(3600);
    expect(days[6]?.dayKey).toBe("2026-06-21");
  });

  it("clips days outside the selected date range", () => {
    const weekStart = new Date(Date.UTC(2026, 5, 15));
    const days = buildWeekDayTabs(
      weekStart,
      [log({ startTime: "2026-06-16T10:00:00.000Z", durationSec: 3600 })],
      "UTC",
      "monday",
      "2026-06-16",
      "2026-06-18"
    );

    expect(days).toHaveLength(3);
    expect(days.map((day) => day.dayKey)).toEqual(["2026-06-16", "2026-06-17", "2026-06-18"]);
  });
});

describe("groupLogsByDay", () => {
  it("groups logs by day and sorts chronologically within week", () => {
    const days = groupLogsByDay(
      [
        log({ id: "a", startTime: "2026-06-10T10:00:00.000Z", durationSec: 3600 }),
        log({ id: "b", startTime: "2026-06-09T10:00:00.000Z", durationSec: 7200 }),
        log({ id: "c", startTime: "2026-06-11T10:00:00.000Z", durationSec: 1800 })
      ],
      "UTC",
      "monday"
    );

    expect(days).toHaveLength(3);
    expect(days.map((d) => d.dayKey)).toEqual(["2026-06-09", "2026-06-10", "2026-06-11"]);
    expect(days[0]?.totalSec).toBe(7200);
    expect(days[1]?.logs.map((l) => l.id)).toEqual(["a"]);
    expect(days[2]?.totalSec).toBe(1800);
  });
});
