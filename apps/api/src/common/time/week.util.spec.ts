import { describe, expect, it } from "vitest";
import { daysInRange, formatWeekLabel, getWeekStartUtc } from "./week.util";

describe("week.util", () => {
  it("getWeekStartUtc monday week", () => {
    const wed = new Date("2024-01-10T12:00:00Z");
    expect(getWeekStartUtc(wed, "monday")).toBe("2024-01-08");
  });

  it("formatWeekLabel", () => {
    expect(formatWeekLabel("2024-01-08")).toBe("Week of 2024-01-08");
  });

  it("daysInRange", () => {
    const from = new Date("2024-01-01");
    const to = new Date("2024-01-03");
    expect(daysInRange(from, to)).toBeGreaterThanOrEqual(1);
  });
});
