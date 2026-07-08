import { submissionPeriodEndDateKey } from "@kloqra/web-shared";
import { describe, expect, it } from "vitest";

describe("admin approvals period helpers", () => {
  it("derives weekly period end keys for missing-tab anchors", () => {
    expect(submissionPeriodEndDateKey("2026-07-07T00:00:00.000Z", "weekly")).toBe("2026-07-13");
  });
});
