import type { AuthSessionDto } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import {
  getSessionCapabilities,
  resolveSessionManagedRoles,
  sessionCan
} from "./session-capabilities";

const BASE_SESSION: AuthSessionDto = {
  user: { id: "00000000-0000-4000-8000-000000000001", name: "User" },
  tenantId: "00000000-0000-4000-8000-000000000002",
  workspaceId: "00000000-0000-4000-8000-000000000003",
  workspaceName: "Workspace",
  workspaceRole: "MEMBER"
};

describe("session capabilities", () => {
  it("combines tenant and workspace managed roles", () => {
    const session: AuthSessionDto = {
      ...BASE_SESSION,
      tenantRole: "OWNER",
      workspaceRole: "ADMIN"
    };

    expect(resolveSessionManagedRoles(session)).toEqual(["TENANT_OWNER", "WORKSPACE_ADMIN"]);
    expect(sessionCan(session, "tenant:ManageBilling")).toBe(true);
    expect(sessionCan(session, "workspace:ManageMembers")).toBe(true);
    expect(sessionCan(session, "personal:ManageTimer")).toBe(true);
  });

  it("adds project-manager capabilities without expanding workspace scope", () => {
    const session: AuthSessionDto = {
      ...BASE_SESSION,
      managedProjectIds: ["00000000-0000-4000-8000-000000000004"]
    };

    expect(resolveSessionManagedRoles(session)).toEqual(["WORKSPACE_MEMBER", "PROJECT_MANAGER"]);
    expect(sessionCan(session, "project:ManageTasks")).toBe(true);
    expect(sessionCan(session, "workspace:ManageMembers")).toBe(false);
  });

  it("prefers the server capability snapshot when present", () => {
    const session: AuthSessionDto = {
      ...BASE_SESSION,
      workspaceRole: "ADMIN",
      capabilities: ["personal:ManageTimer"]
    };

    expect(getSessionCapabilities(session)).toEqual(["personal:ManageTimer"]);
    expect(sessionCan(session, "workspace:ManageMembers")).toBe(false);
  });
});
