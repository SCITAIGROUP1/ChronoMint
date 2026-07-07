import type { AuthSessionDto } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { compareSessionIdentity, getSessionIdentity } from "./session-identity";

const tenantOperator = {
  user: { id: "user-1", name: "Owner" },
  tenantId: "tenant-1",
  tenantRole: "OWNER" as const,
  requiresWorkspaceSetup: true as const
} satisfies AuthSessionDto;

const workspaceSession = {
  user: { id: "user-1", name: "Owner" },
  tenantId: "tenant-1",
  tenantRole: "OWNER" as const,
  workspaceId: "ws-1",
  workspaceRole: "ADMIN" as const
} satisfies AuthSessionDto;

describe("session-identity", () => {
  it("detects no change on identical refresh", () => {
    const a = getSessionIdentity(workspaceSession);
    const b = getSessionIdentity({
      ...workspaceSession,
      user: { ...workspaceSession.user, name: "New" }
    });
    expect(compareSessionIdentity(a, b)).toBe("none");
  });

  it("detects workspace boundary when workspaceId changes", () => {
    const a = getSessionIdentity(tenantOperator);
    const b = getSessionIdentity(workspaceSession);
    expect(compareSessionIdentity(a, b)).toBe("workspace");
  });

  it("detects full boundary when user changes", () => {
    const a = getSessionIdentity(workspaceSession);
    const b = getSessionIdentity({ ...workspaceSession, user: { id: "user-2", name: "Other" } });
    expect(compareSessionIdentity(a, b)).toBe("full");
  });
});
