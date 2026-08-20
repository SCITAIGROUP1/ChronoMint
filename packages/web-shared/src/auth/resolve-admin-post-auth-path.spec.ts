import type { AuthSessionDto } from "@kloqra/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspacesStore } from "../stores/workspaces.store";
import { resolveAdminPostAuthPath } from "./resolve-admin-post-auth-path";

const { apiMock, fetchProfileMock } = vi.hoisted(() => ({
  apiMock: vi.fn(),
  fetchProfileMock: vi.fn()
}));

vi.mock("../api/client", () => ({
  api: apiMock
}));

vi.mock("../stores/user-profile.store", () => ({
  fetchUserProfile: (...args: unknown[]) => fetchProfileMock(...args)
}));

const ownerSession = {
  tenantRole: "OWNER",
  workspaceId: "ws-1",
  workspaceRole: "ADMIN"
} as AuthSessionDto;

const workspaces = [
  { id: "ws-1", name: "Acme", slug: "acme", role: "ADMIN" as const },
  { id: "ws-2", name: "Meridian", slug: "meridian", role: "ADMIN" as const }
];

describe("resolveAdminPostAuthPath", () => {
  beforeEach(() => {
    apiMock.mockReset();
    fetchProfileMock.mockReset();
    fetchProfileMock.mockResolvedValue({ preferences: {} });
    useWorkspacesStore.getState().clear();
  });

  it("short-circuits to organization setup when workspace setup is required", async () => {
    apiMock.mockResolvedValue({
      id: "t-1",
      name: "Org",
      slug: "org",
      status: "pending_setup",
      settings: {},
      createdAt: new Date().toISOString()
    });

    await expect(
      resolveAdminPostAuthPath({
        tenantRole: "OWNER",
        requiresWorkspaceSetup: true,
        user: { id: "u-1", email: "o@example.com", name: "Owner" }
      } as AuthSessionDto)
    ).resolves.toBe("/account/organization");
    expect(apiMock).toHaveBeenCalledTimes(1);
  });

  it("routes tenant owner with one workspace to select-context", async () => {
    apiMock.mockResolvedValue(workspaces.slice(0, 1));

    await expect(resolveAdminPostAuthPath(ownerSession)).resolves.toBe("/select-context");
    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(useWorkspacesStore.getState().workspaces).toHaveLength(1);
  });

  it("routes workspace-only admin with multiple workspaces to select-workspace", async () => {
    apiMock.mockResolvedValue(workspaces);

    await expect(
      resolveAdminPostAuthPath({
        workspaceId: "ws-1",
        workspaceRole: "ADMIN"
      } as AuthSessionDto)
    ).resolves.toBe("/select-workspace");
    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(useWorkspacesStore.getState().workspaces).toHaveLength(2);
  });

  it("routes a plain member to overview instead of dashboard", async () => {
    apiMock.mockResolvedValue([
      { id: "ws-1", name: "Acme", slug: "acme", role: "MEMBER" as const }
    ]);

    await expect(
      resolveAdminPostAuthPath({
        workspaceId: "ws-1",
        workspaceRole: "MEMBER",
        user: { id: "u-1", email: "m@example.com", name: "Member" }
      } as AuthSessionDto)
    ).resolves.toBe("/overview");
  });
});
