import { describe, expect, it } from "vitest";
import { normalizeSubmissionDateKey } from "./submission-date-key";

describe("normalizeSubmissionDateKey", () => {
  it("collapses full ISO timestamps to YYYY-MM-DD", () => {
    expect(normalizeSubmissionDateKey("2026-07-08T13:22:45.123Z")).toBe("2026-07-08");
    expect(normalizeSubmissionDateKey("2026-07-08T23:59:59.999Z")).toBe("2026-07-08");
  });

  it("keeps day-only keys stable", () => {
    expect(normalizeSubmissionDateKey("2026-07-08")).toBe("2026-07-08");
  });

  it("does not re-zone bare YYYY-MM-DD through Date (browser TZ trap)", () => {
    // Prefer-calendar keys must stay as provided even when local midnight would shift UTC day.
    expect(normalizeSubmissionDateKey("2026-07-08")).toBe("2026-07-08");
  });

  it("uses display timezone for ISO timestamps when provided", () => {
    // 2026-07-08 01:00 Colombo is still Jul 8 local but Jul 7 UTC.
    expect(normalizeSubmissionDateKey("2026-07-07T20:30:00.000Z", "Asia/Colombo")).toBe(
      "2026-07-08"
    );
  });
});
