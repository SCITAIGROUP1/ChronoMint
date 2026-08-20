import { normalizeSubmissionDateKey } from "@kloqra/web-shared";
import { describe, expect, it } from "vitest";
import {
  countActionableSubmissions,
  countDueSubmissions,
  countOpenDraftSubmissions,
  filterSubmissionsByPeriodRange,
  isDueSubmissionAction,
  openDraftsNotice
} from "./use-my-submissions";

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

describe("open vs due submissions", () => {
  const now = new Date("2026-08-20T10:30:00.000Z");
  const openWeek = {
    ...baseSubmission,
    id: "open-week",
    periodStart: "2026-08-16T18:30:00.000Z",
    periodEnd: "2026-08-23T18:29:59.999Z"
  };
  const closedWeek = {
    ...baseSubmission,
    id: "closed-week",
    periodStart: "2026-08-09T18:30:00.000Z",
    periodEnd: "2026-08-16T18:29:59.999Z"
  };

  it("treats a closed draft as due and an open draft as in progress", () => {
    expect(isDueSubmissionAction(closedWeek, now)).toBe(true);
    expect(isDueSubmissionAction(openWeek, now)).toBe(false);
    expect(countDueSubmissions([closedWeek, openWeek], now)).toBe(1);
    expect(countOpenDraftSubmissions([closedWeek, openWeek], now)).toBe(1);
    expect(countActionableSubmissions([closedWeek, openWeek])).toBe(2);
  });

  it("keeps rejected periods due even if the calendar period is still open", () => {
    expect(isDueSubmissionAction({ ...openWeek, status: "REJECTED" as const }, now)).toBe(true);
  });

  it("explains in-progress day, week, and month drafts", () => {
    expect(openDraftsNotice([openWeek], now)).toBe(
      "This week is still in progress. Submitting now is optional — remaining hours will lock until review."
    );
    expect(
      openDraftsNotice(
        [
          {
            ...openWeek,
            approvalPeriod: "daily" as const,
            periodEnd: "2026-08-20T18:29:59.999Z"
          }
        ],
        now
      )
    ).toContain("This day is still in progress");
    expect(
      openDraftsNotice(
        [
          {
            ...openWeek,
            approvalPeriod: "monthly" as const,
            periodEnd: "2026-08-31T18:29:59.999Z"
          }
        ],
        now
      )
    ).toContain("This month is still in progress");
  });
});
