import { describe, expect, it } from "vitest";
import {
  buildAdminApprovalsHref,
  buildMemberSubmissionsHref,
  buildApprovalsListQueryString,
  buildApprovalsCountQueryString,
  hasActiveApprovalsFilter,
  parseAdminApprovalsSearch,
  parseMemberSubmissionsSearch,
  resolveMemberSubmissionsTab,
  APPROVALS_TABLE_PAGE_SIZE
} from "./submission-deep-link";

describe("submission deep links", () => {
  it("builds member submissions href", () => {
    expect(
      buildMemberSubmissionsHref({
        projectId: "p1",
        periodStart: "2026-06-09T00:00:00.000Z",
        highlight: "remind"
      })
    ).toBe("/submissions?projectId=p1&periodStart=2026-06-09T00%3A00%3A00.000Z&highlight=remind");
    expect(buildMemberSubmissionsHref({ tab: "action" })).toBe("/submissions?tab=action");
    expect(buildMemberSubmissionsHref({ tab: "all" })).toBe("/submissions");
  });

  it("builds admin approvals href", () => {
    expect(
      buildAdminApprovalsHref({
        tab: "amendments",
        amendmentId: "a1",
        projectId: "p1",
        userId: "u1",
        from: "2026-03-01",
        to: "2026-03-31"
      })
    ).toBe(
      "/approvals?tab=amendments&amendmentId=a1&projectId=p1&userId=u1&from=2026-03-01&to=2026-03-31"
    );
  });

  it("parses search params", () => {
    expect(parseMemberSubmissionsSearch("projectId=p1&periodStart=iso&highlight=rejected")).toEqual(
      {
        projectId: "p1",
        periodStart: "iso",
        highlight: "rejected",
        tab: undefined
      }
    );
    expect(parseMemberSubmissionsSearch("tab=pending")).toEqual({
      projectId: undefined,
      periodStart: undefined,
      highlight: undefined,
      tab: "pending"
    });
    expect(parseAdminApprovalsSearch("tab=review&periodId=x&projectId=p1&userId=u1")).toEqual({
      tab: "review",
      periodId: "x",
      amendmentId: undefined,
      batch: undefined,
      projectId: "p1",
      userId: "u1",
      from: undefined,
      to: undefined
    });
  });

  it("resolves tab from highlight when tab is omitted", () => {
    expect(resolveMemberSubmissionsTab({ highlight: "rejected" })).toBe("rejected");
    expect(resolveMemberSubmissionsTab({ highlight: "amendment-approved" })).toBe("approved");
    expect(resolveMemberSubmissionsTab({ tab: "pending" })).toBe("pending");
    expect(resolveMemberSubmissionsTab({})).toBe("all");
  });

  it("detects active filters", () => {
    expect(hasActiveApprovalsFilter({})).toBe(false);
    expect(hasActiveApprovalsFilter({ projectId: ["p1"] })).toBe(true);
  });

  it("builds list and count query strings with default pagination", () => {
    expect(buildApprovalsListQueryString({})).toBe(`page=1&limit=${APPROVALS_TABLE_PAGE_SIZE}`);
    expect(buildApprovalsListQueryString({ projectId: ["p1"], page: 2 })).toBe(
      `projectId=p1&page=2&limit=${APPROVALS_TABLE_PAGE_SIZE}`
    );
    expect(buildApprovalsCountQueryString({ projectId: ["p1"] })).toBe(
      "projectId=p1&page=1&limit=1"
    );
  });
});
