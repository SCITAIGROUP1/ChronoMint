import { describe, expect, it } from "vitest";
import {
  buildProjectTeamApprovalsHref,
  formatProjectPendingApprovalsTitle,
  shouldShowProjectPendingApprovalsBanner
} from "./project-team-approvals.util";

describe("shouldShowProjectPendingApprovalsBanner", () => {
  it("hides while loading even if a count is known", () => {
    expect(shouldShowProjectPendingApprovalsBanner(true, 3)).toBe(false);
  });

  it("hides when there are no pending sheets", () => {
    expect(shouldShowProjectPendingApprovalsBanner(false, 0)).toBe(false);
  });

  it("shows when settled with at least one pending sheet", () => {
    expect(shouldShowProjectPendingApprovalsBanner(false, 1)).toBe(true);
  });
});

describe("formatProjectPendingApprovalsTitle", () => {
  it("uses singular copy for one", () => {
    expect(formatProjectPendingApprovalsTitle(1)).toBe("1 timesheet waiting for approval");
  });

  it("uses plural copy for many", () => {
    expect(formatProjectPendingApprovalsTitle(4)).toBe("4 timesheets waiting for approval");
  });
});

describe("buildProjectTeamApprovalsHref", () => {
  it("deep-links to approvals review filtered by project", () => {
    expect(buildProjectTeamApprovalsHref("proj-1")).toBe("/approvals?tab=review&projectId=proj-1");
  });
});
