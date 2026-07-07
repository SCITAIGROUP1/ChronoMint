import type { AuthSessionDto } from "@kloqra/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAdminPostAuthPath } from "./resolve-admin-post-auth-path";

const { apiMock } = vi.hoisted(() => ({
  apiMock: vi.fn()
}));

vi.mock("../api/client", () => ({
  api: apiMock
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
  });

  it("routes tenant owner with one workspace to select-context", async () => {
    apiMock.mockResolvedValue(workspaces.slice(0, 1));

    await expect(resolveAdminPostAuthPath(ownerSession)).resolves.toBe("/select-context");
  });

  it("routes workspace-only admin with multiple workspaces to select-workspace", async () => {
    apiMock.mockResolvedValue(workspaces);

    await expect(
      resolveAdminPostAuthPath({
        workspaceId: "ws-1",
        workspaceRole: "ADMIN"
      } as AuthSessionDto)
    ).resolves.toBe("/select-workspace");
  });
});
