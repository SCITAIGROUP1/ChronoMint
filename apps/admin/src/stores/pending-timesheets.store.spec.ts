import { buildApprovalsListQueryString } from "@kloqra/web-shared";
import { describe, expect, it } from "vitest";
import { usePendingTimesheetsListKey } from "./pending-timesheets.store";

describe("pending-timesheets.store", () => {
  it("builds list cache keys with default pagination params", () => {
    const workspaceId = "ws-1";
    const filterKey = buildApprovalsListQueryString({});
    expect(usePendingTimesheetsListKey(workspaceId, {})).toBe(`${workspaceId}:${filterKey}`);
    expect(filterKey).toContain("page=1");
    expect(filterKey).toContain("limit=10");
  });
});
