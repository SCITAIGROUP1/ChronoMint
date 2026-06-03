import { describe, expect, it } from "vitest";
import { daysInRange, formatWeekLabel, getWeekStartUtc } from "./export-week.util";

describe("export-week.util", () => {
  it("gets Monday week start by default", () => {
    const wed = new Date("2025-06-04T12:00:00Z");
    expect(getWeekStartUtc(wed, "monday")).toBe("2025-06-02");
  });

  it("gets Sunday week start when configured", () => {
    const wed = new Date("2025-06-04T12:00:00Z");
    expect(getWeekStartUtc(wed, "sunday")).toBe("2025-06-01");
  });

  it("formats week label", () => {
    expect(formatWeekLabel("2025-06-02")).toBe("Week of 2025-06-02");
  });

  it("counts days in range", () => {
    const from = new Date("2025-06-01T00:00:00Z");
    const to = new Date("2025-06-03T23:59:59Z");
    expect(daysInRange(from, to)).toBeGreaterThanOrEqual(2);
  });
});
