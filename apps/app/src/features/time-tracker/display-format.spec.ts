import { describe, expect, it } from "vitest";
import { formatEntryShortDate, formatEntryTimeRange } from "./display-format";

describe("time-tracker display-format", () => {
  it("formats compact entry dates", () => {
    expect(formatEntryShortDate(new Date("2026-06-12T12:00:00.000Z"), "UTC")).toBe("Jun 12");
  });

  it("formats read-only start–end clock range in timezone", () => {
    expect(
      formatEntryTimeRange("2026-06-12T13:05:00.000Z", "2026-06-12T14:35:00.000Z", "UTC")
    ).toBe("13:05 – 14:35");
  });
});
