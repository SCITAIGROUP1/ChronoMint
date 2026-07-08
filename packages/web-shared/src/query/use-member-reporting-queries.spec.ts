/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { submissionsQueryKeys } from "./submissions-query-keys";
import { weekSummaryQueryKeys } from "./week-summary-query-keys";

describe("member reporting query keys", () => {
  it("builds distinct submissions and week summary keys", () => {
    const ws = "ws-1";
    expect(submissionsQueryKeys.list(ws, "all")).toEqual(["submissions", ws, "all"]);
    expect(submissionsQueryKeys.list(ws, "status=submitted")).toEqual([
      "submissions",
      ws,
      "status=submitted"
    ]);
    expect(weekSummaryQueryKeys.workspace(ws)).toEqual(["weekSummary", ws]);
    expect(submissionsQueryKeys.list(ws, "all")).not.toEqual(weekSummaryQueryKeys.workspace(ws));
  });
});
