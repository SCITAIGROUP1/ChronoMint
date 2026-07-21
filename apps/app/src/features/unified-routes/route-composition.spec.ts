import type { AuthSessionDto } from "@kloqra/contracts";
import { getManagedRolePermissions } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import {
  resolveProjectDetailExperience,
  resolveProjectsExperience,
  resolveTimeTrackerExperience
} from "./route-composition";

const BASE_SESSION: AuthSessionDto = {
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    email: "member@example.com",
    name: "Member"
  },
  tenantId: "00000000-0000-4000-8000-000000000002",
  workspaceId: "00000000-0000-4000-8000-000000000003",
  workspaceName: "Workspace",
  workspaceRole: "MEMBER"
};

describe("UPS-05B route composition", () => {
  it("keeps plain members on personal data without workspace-wide API access", () => {
    const session = {
      ...BASE_SESSION,
      capabilities: getManagedRolePermissions(["WORKSPACE_MEMBER"])
    };

    expect(resolveProjectsExperience(session)).toEqual({
      mode: "personal",
      managedProjectIds: [],
      canCallWorkspaceWideApis: false
    });
    expect(resolveProjectDetailExperience(session, "project-1").mode).toBe("personal");
    expect(resolveTimeTrackerExperience(session)).toEqual({
      mode: "personal",
      managedProjectIds: [],
      canCallWorkspaceWideApis: false
    });
  });

  it("constrains project managers to the managed project snapshot", () => {
    const session = {
      ...BASE_SESSION,
      managedProjectIds: ["project-1", "project-2"],
      capabilities: getManagedRolePermissions(["WORKSPACE_MEMBER", "PROJECT_MANAGER"])
    };

    expect(resolveProjectsExperience(session)).toEqual({
      mode: "managed",
      managedProjectIds: ["project-1", "project-2"],
      canCallWorkspaceWideApis: false
    });
    expect(resolveProjectDetailExperience(session, "project-1").mode).toBe("managed");
    expect(resolveProjectDetailExperience(session, "project-outside-scope").mode).toBe("personal");
    expect(resolveTimeTrackerExperience(session)).toEqual({
      mode: "managed",
      managedProjectIds: ["project-1", "project-2"],
      canCallWorkspaceWideApis: false
    });
  });

  it("preserves workspace-admin management parity", () => {
    const session = {
      ...BASE_SESSION,
      workspaceRole: "ADMIN" as const,
      capabilities: getManagedRolePermissions(["WORKSPACE_ADMIN"])
    };

    expect(resolveProjectsExperience(session).mode).toBe("workspace");
    expect(resolveProjectDetailExperience(session, "project-1").mode).toBe("workspace");
    expect(resolveTimeTrackerExperience(session)).toEqual({
      mode: "workspace",
      managedProjectIds: [],
      canCallWorkspaceWideApis: true
    });
  });
});
