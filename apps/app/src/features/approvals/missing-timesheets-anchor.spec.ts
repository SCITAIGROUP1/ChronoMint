import { describe, expect, it } from "vitest";
import { resolveMissingTimesheetsAnchorDateKey } from "./missing-timesheets-anchor";

describe("resolveMissingTimesheetsAnchorDateKey", () => {
  it("uses the frozen filter from date when present", () => {
    expect(resolveMissingTimesheetsAnchorDateKey("2026-07-01", "Asia/Colombo")).toBe("2026-07-01");
  });

  it("falls back to workspace today in the operational timezone", () => {
    const key = resolveMissingTimesheetsAnchorDateKey(undefined, "Asia/Colombo");
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
