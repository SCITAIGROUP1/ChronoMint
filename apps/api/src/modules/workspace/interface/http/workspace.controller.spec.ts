import { ROUTES } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { WorkspaceController } from "./workspace.controller";

describe("WorkspaceController bulk invite job status", () => {
  it("exposes bulk members job status route", () => {
    expect(ROUTES.WORKSPACES.BULK_MEMBERS_JOB("ws-1", "job-1")).toBe(
      "/workspaces/ws-1/members/bulk/jobs/job-1"
    );
    expect(typeof WorkspaceController.prototype.getBulkInviteJobStatus).toBe("function");
  });
});
