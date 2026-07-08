import { describe, expect, it } from "vitest";
import { normalizeSubmissionDateKey } from "./submission-date-key";
import { buildSubmissionsLookbackQueryKey } from "./use-approvals-queries";

describe("buildSubmissionsLookbackQueryKey", () => {
  it("uses the same key for status lookback and submissions page lookback", () => {
    const key = buildSubmissionsLookbackQueryKey(26, "2026-07-08", "assigned");
    expect(key).toBe("lookback=26&date=2026-07-08&scope=assigned");
  });

  it("does not shift bare calendar keys through UTC", () => {
    const key = buildSubmissionsLookbackQueryKey(26, "2026-07-08", "assigned");
    expect(key).toContain("date=2026-07-08");
  });
});

describe("missing timesheets anchor date key", () => {
  it("normalizes calendar day keys for the missing list API", () => {
    expect(normalizeSubmissionDateKey("2026-07-08")).toBe("2026-07-08");
    expect(normalizeSubmissionDateKey("2026-07-08T12:00:00.000Z")).toBe("2026-07-08");
  });
});
