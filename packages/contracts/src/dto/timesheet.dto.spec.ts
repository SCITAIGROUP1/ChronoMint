import { describe, expect, it } from "vitest";
import {
  bulkReviewTimesheetSchema,
  listPendingTimesheetsResponseSchema,
  timesheetApprovalsFilterQuerySchema
} from "./timesheet.dto";

const UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("timesheet.dto", () => {
  it("validates approvals filter pagination query", () => {
    const parsed = timesheetApprovalsFilterQuerySchema.safeParse({ page: "2", limit: "10" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.page).toBe(2);
      expect(parsed.data.limit).toBe(10);
    }
  });

  it("validates paginated pending timesheets response", () => {
    const parsed = listPendingTimesheetsResponseSchema.safeParse({
      items: [],
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0
    });
    expect(parsed.success).toBe(true);
  });

  it("requires ids and action for bulk review", () => {
    expect(bulkReviewTimesheetSchema.safeParse({ ids: [], action: "approve" }).success).toBe(false);
    expect(
      bulkReviewTimesheetSchema.safeParse({
        ids: [UUID],
        action: "reject",
        reviewNote: "Fix hours"
      }).success
    ).toBe(true);
  });
});
