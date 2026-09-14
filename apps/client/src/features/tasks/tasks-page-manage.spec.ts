import type { AuthSessionDto } from "@kloqra/contracts";
import { getManagedRolePermissions } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { resolveProjectsExperience } from "@/features/unified-routes/route-composition";

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

function canManageTasks(session: AuthSessionDto) {
  const experience = resolveProjectsExperience(session);
  return experience.mode === "workspace" || experience.mode === "managed";
}

describe("Tasks page manage gating", () => {
  it("allows manage for workspace admins", () => {
    const session = {
      ...BASE_SESSION,
      workspaceRole: "ADMIN" as const,
      capabilities: getManagedRolePermissions(["WORKSPACE_ADMIN"])
    };
    expect(resolveProjectsExperience(session).mode).toBe("workspace");
    expect(canManageTasks(session)).toBe(true);
  });

  it("allows manage for project managers", () => {
    const session = {
      ...BASE_SESSION,
      managedProjectIds: ["project-1"],
      capabilities: getManagedRolePermissions(["WORKSPACE_MEMBER", "PROJECT_MANAGER"])
    };
    expect(resolveProjectsExperience(session).mode).toBe("managed");
    expect(canManageTasks(session)).toBe(true);
  });

  it("denies manage for personal members", () => {
    const session = {
      ...BASE_SESSION,
      capabilities: getManagedRolePermissions(["WORKSPACE_MEMBER"])
    };
    expect(resolveProjectsExperience(session).mode).toBe("personal");
    expect(canManageTasks(session)).toBe(false);
  });
});
