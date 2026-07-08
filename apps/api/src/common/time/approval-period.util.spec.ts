import { describe, expect, it } from "vitest";
import { getPeriodRange } from "./approval-period.util";

describe("getPeriodRange", () => {
  const utcSettings = { weekStart: "monday" as const, timezone: "UTC" };
  const colomboSettings = { weekStart: "monday" as const, timezone: "Asia/Colombo" };

  it("returns weekly range in UTC", () => {
    const { periodStart, periodEnd, approvalPeriod } = getPeriodRange(
      "2025-01-08T12:00:00.000Z",
      "weekly",
      utcSettings
    );
    expect(approvalPeriod).toBe("weekly");
    expect(periodStart.toISOString()).toBe("2025-01-06T00:00:00.000Z");
    expect(periodEnd.toISOString()).toBe("2025-01-12T23:59:59.999Z");
  });

  it("returns daily range in UTC", () => {
    const { periodStart, periodEnd } = getPeriodRange(
      "2025-01-08T12:00:00.000Z",
      "daily",
      utcSettings
    );
    expect(periodStart.toISOString()).toBe("2025-01-08T00:00:00.000Z");
    expect(periodEnd.getUTCDate()).toBe(8);
  });

  it("returns monthly range in UTC", () => {
    const { periodStart, periodEnd } = getPeriodRange(
      "2025-01-15T12:00:00.000Z",
      "monthly",
      utcSettings
    );
    expect(periodStart.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    expect(periodEnd.getUTCMonth()).toBe(0);
    expect(periodEnd.getUTCDate()).toBe(31);
  });

  it("attributes Colombo local midnight to the local calendar day (daily)", () => {
    // Jul 8 00:00 Asia/Colombo = 2026-07-07T18:30:00.000Z
    const instant = "2026-07-07T18:30:00.000Z";
    const colombo = getPeriodRange(instant, "daily", colomboSettings);
    expect(colombo.periodStart.toISOString()).toBe("2026-07-07T18:30:00.000Z");
    expect(colombo.periodEnd.toISOString()).toBe("2026-07-08T18:29:59.999Z");

    const utc = getPeriodRange(instant, "daily", utcSettings);
    expect(utc.periodStart.toISOString()).toBe("2026-07-07T00:00:00.000Z");
  });

  it("uses workspace TZ for weekly boundaries (not bare UTC week)", () => {
    // Sun Jul 12 22:00 UTC = Mon Jul 13 03:30 Colombo → Colombo week of Jul 13
    const instant = "2026-07-12T22:00:00.000Z";
    const colombo = getPeriodRange(instant, "weekly", colomboSettings);
    // Monday Jul 13 00:00 Colombo = Jul 12 18:30Z
    expect(colombo.periodStart.toISOString()).toBe("2026-07-12T18:30:00.000Z");
    // Sunday Jul 19 23:59:59.999 Colombo = Jul 19 18:29:59.999Z
    expect(colombo.periodEnd.toISOString()).toBe("2026-07-19T18:29:59.999Z");

    const utc = getPeriodRange(instant, "weekly", utcSettings);
    // UTC Sunday Jul 12 → week starting Mon Jul 6
    expect(utc.periodStart.toISOString()).toBe("2026-07-06T00:00:00.000Z");
  });
});
