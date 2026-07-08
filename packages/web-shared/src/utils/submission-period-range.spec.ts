import { describe, expect, it } from "vitest";
import { submissionPeriodEndDateKey } from "./submission-period-range";

describe("submissionPeriodEndDateKey", () => {
  it("returns same day for daily periods", () => {
    expect(submissionPeriodEndDateKey("2026-07-08T00:00:00.000Z", "daily")).toBe("2026-07-08");
  });

  it("returns +6 days for weekly periods", () => {
    expect(submissionPeriodEndDateKey("2026-07-08T00:00:00.000Z", "weekly")).toBe("2026-07-14");
  });

  it("returns month end for monthly periods", () => {
    expect(submissionPeriodEndDateKey("2026-07-08T00:00:00.000Z", "monthly")).toBe("2026-07-31");
  });
});
