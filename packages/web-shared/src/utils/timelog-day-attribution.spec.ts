import { describe, expect, it } from "vitest";
import {
  countLogsForDateKey,
  logStartDateKey,
  resolveLogDurationSec,
  sumDurationSecForDateKey,
  sumDurationSecForDateKeyWithTimer
} from "./timelog-day-attribution";

describe("timelog day attribution (preference TZ start day)", () => {
  it("keys an overnight Colombo entry to the local start day", () => {
    // Wed Jul 8 20:30 Asia/Colombo → Thu 01:30
    const overnight = { startTime: "2026-07-08T15:00:00.000Z", durationSec: 18_000 };
    expect(logStartDateKey(overnight, "Asia/Colombo")).toBe("2026-07-08");
    expect(logStartDateKey(overnight, "UTC")).toBe("2026-07-08");
  });

  it("sums full duration on start day and zero on the following calendar day", () => {
    const sameDay = {
      startTime: "2026-07-08T09:00:00.000Z",
      endTime: "2026-07-08T14:00:00.000Z",
      durationSec: 18_000
    };
    const overnight = {
      startTime: "2026-07-08T15:00:00.000Z",
      endTime: "2026-07-08T20:00:00.000Z",
      durationSec: 18_000
    };
    const logs = [sameDay, overnight];

    expect(sumDurationSecForDateKey(logs, "2026-07-08", "Asia/Colombo")).toBe(36_000);
    expect(sumDurationSecForDateKey(logs, "2026-07-09", "Asia/Colombo")).toBe(0);
  });

  it("does not clip overnight seconds into the next day (timesheet vs tracker regression)", () => {
    // Clip rule would give Wed 3.5h + Thu 1.5h for a 5h overnight; start-day rule is 5h Wed.
    const overnight = {
      startTime: "2026-07-08T15:00:00.000Z",
      endTime: "2026-07-08T20:00:00.000Z",
      durationSec: 18_000
    };
    expect(sumDurationSecForDateKey([overnight], "2026-07-08", "Asia/Colombo")).toBe(18_000);
    expect(sumDurationSecForDateKey([overnight], "2026-07-09", "Asia/Colombo")).toBe(0);
  });

  it("falls back to end-start when durationSec is missing", () => {
    expect(
      resolveLogDurationSec({
        startTime: "2026-07-08T09:00:00.000Z",
        endTime: "2026-07-08T10:00:00.000Z"
      })
    ).toBe(3600);
  });

  it("attributes active timer to the day it started", () => {
    expect(
      sumDurationSecForDateKeyWithTimer([], "2026-07-08", "Asia/Colombo", {
        startedAt: "2026-07-08T15:00:00.000Z",
        elapsedSec: 1200,
        liveElapsedSec: 1200
      })
    ).toBe(1200);
    expect(
      sumDurationSecForDateKeyWithTimer([], "2026-07-09", "Asia/Colombo", {
        startedAt: "2026-07-08T15:00:00.000Z",
        elapsedSec: 1200,
        liveElapsedSec: 1200
      })
    ).toBe(0);
  });

  it("counts finished entries on the start day only", () => {
    const overnight = {
      startTime: "2026-07-08T15:00:00.000Z",
      endTime: "2026-07-08T20:00:00.000Z",
      durationSec: 18_000
    };
    expect(countLogsForDateKey([overnight], "2026-07-08", "Asia/Colombo")).toBe(1);
    expect(countLogsForDateKey([overnight], "2026-07-09", "Asia/Colombo")).toBe(0);
  });
});
