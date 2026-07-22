import { normalizeSubmissionDateKey } from "@kloqra/web-shared";
import { describe, expect, it } from "vitest";
import { filterSubmissionsByPeriodRange } from "./use-my-submissions";

const baseSubmission = {
  id: "period-1",
  userId: "user-1",
  workspaceId: "ws-1",
  projectId: "proj-1",
  projectName: "Support Retainer",
  periodStart: "2025-06-02T00:00:00.000Z",
  periodEnd: "2025-06-08T23:59:59.999Z",
  approvalPeriod: "weekly" as const,
  note: null,
  reviewNote: null,
  reviewedBy: null,
  submittedAt: null,
  reviewedAt: null,
  status: "DRAFT" as const
};

describe("filterSubmissionsByPeriodRange", () => {
  it("filters by period start using display timezone for ISO timestamps", () => {
    const items = [
      baseSubmission,
      {
        ...baseSubmission,
        id: "period-2",
        periodStart: "2025-07-01T00:00:00.000Z"
      }
    ];
    expect(filterSubmissionsByPeriodRange(items, "2025-06-01", "2025-06-30", "UTC")).toHaveLength(
      1
    );
    expect(filterSubmissionsByPeriodRange(items, "", "")).toHaveLength(2);
  });

  it("uses timezone when comparing period start to range keys", () => {
    // 2025-06-01 22:00 UTC is 2025-06-02 in Asia/Colombo (+05:30).
    const colomboItem = {
      ...baseSubmission,
      periodStart: "2025-06-01T22:00:00.000Z"
    };
    expect(
      filterSubmissionsByPeriodRange([colomboItem], "2025-06-02", "2025-06-02", "Asia/Colombo")
    ).toHaveLength(1);
    expect(
      filterSubmissionsByPeriodRange([colomboItem], "2025-06-01", "2025-06-01", "UTC")
    ).toHaveLength(1);
  });
});

describe("normalizeSubmissionDateKey (period filter helper)", () => {
  it("keeps bare YYYY-MM-DD stable for range comparisons", () => {
    expect(normalizeSubmissionDateKey("2026-07-08")).toBe("2026-07-08");
  });
});
