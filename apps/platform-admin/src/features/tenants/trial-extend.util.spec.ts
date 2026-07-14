import { describe, expect, it } from "vitest";
import {
  formatTrialEndLabel,
  isoToLocalDateKey,
  localDateKeyToEndOfDayIso,
  previewTrialEndsAtFromDays
} from "./trial-extend.util";

describe("previewTrialEndsAtFromDays", () => {
  const now = new Date("2026-07-14T12:00:00.000Z");

  it("extends from current end when still active", () => {
    const result = previewTrialEndsAtFromDays("2026-07-20T12:00:00.000Z", 7, now);
    expect(result.toISOString()).toBe("2026-07-27T12:00:00.000Z");
  });

  it("extends from now when expired", () => {
    const result = previewTrialEndsAtFromDays("2026-07-01T12:00:00.000Z", 14, now);
    expect(result.toISOString()).toBe("2026-07-28T12:00:00.000Z");
  });
});

describe("local trial date helpers", () => {
  it("round-trips a date key without shifting the calendar day", () => {
    const key = "2027-03-30";
    const iso = localDateKeyToEndOfDayIso(key);
    expect(isoToLocalDateKey(iso)).toBe(key);
  });

  it("formats trial end from local calendar day", () => {
    const iso = localDateKeyToEndOfDayIso("2027-03-30");
    expect(formatTrialEndLabel(iso)).toMatch(/Ends .*30/);
  });
});
