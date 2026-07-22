import { PERMISSIONS, POLICY_VERSION } from "@kloqra/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionMatrixService } from "./permission-matrix.service";

describe("PermissionMatrixService", () => {
  const tenantMemberFindUnique = vi.fn();
  const tenantMemberFindMany = vi.fn();
  const workspaceMemberFindMany = vi.fn();
  const teamMemberFindMany = vi.fn();
  const principalOverrideGroupBy = vi.fn();
  const loadOverrides = vi.fn();
  const document = vi.fn();
  let service: PermissionMatrixService;

  beforeEach(() => {
    tenantMemberFindUnique.mockReset();
    tenantMemberFindMany.mockReset();
    workspaceMemberFindMany.mockReset();
    teamMemberFindMany.mockReset();
    principalOverrideGroupBy.mockReset();
    loadOverrides.mockReset();
    document.mockReset();
    document.mockImplementation(
      async (_tenantId: string, target: { type: string; role?: string }) => ({
        policyVersion: POLICY_VERSION,
        policyChecksum: "sha256:test",
        revision: 0,
        target,
        items: PERMISSIONS.map((permission) => ({
          permission,
          target,
          configured: "INHERIT",
          effective:
            target.type === "ROLE" &&
            (target.role === "TENANT_OWNER" || target.role === "TENANT_ADMIN") &&
            permission.startsWith("tenant:")
              ? "ALLOW"
              : "DENY",
          source: "CANONICAL_ROLE"
        }))
      })
    );
    loadOverrides.mockResolvedValue(undefined);
    principalOverrideGroupBy.mockResolvedValue([]);
    service = new PermissionMatrixService(
      {
        tenantMember: {
          findUnique: tenantMemberFindUnique,
          findMany: tenantMemberFindMany
        },
        workspaceMember: {
          findMany: workspaceMemberFindMany
        },
        teamMember: {
          findMany: teamMemberFindMany
        },
        principalPermissionOverride: {
          groupBy: principalOverrideGroupBy
        }
      } as never,
      {
        document,
        loadOverrides
      } as never
    );
  });

  it("returns the canonical permission matrix for managed roles", async () => {
    const result = await service.getMatrix("tenant-matrix-test");

    expect(result.policyVersion).toBe(POLICY_VERSION);
    expect(result.roles).toEqual([
      "TENANT_OWNER",
      "TENANT_ADMIN",
      "WORKSPACE_ADMIN",
      "WORKSPACE_MEMBER",
      "PROJECT_MANAGER"
    ]);
    expect(result.items).toHaveLength(PERMISSIONS.length);
    expect(result.items[0]?.rolePermissions).toEqual(
      expect.objectContaining({
        TENANT_OWNER: expect.any(Boolean),
        TENANT_ADMIN: expect.any(Boolean),
        WORKSPACE_ADMIN: expect.any(Boolean),
        WORKSPACE_MEMBER: expect.any(Boolean),
        PROJECT_MANAGER: expect.any(Boolean)
      })
    );
  });

  it("returns inherited permissions for an organization member", async () => {
    tenantMemberFindUnique.mockResolvedValue({
      id: "member-permission-test",
      tenantId: "tenant-permission-test",
      userId: "user-permission-test",
      role: "ADMIN",
      user: {
        name: "Ada Admin",
        email: "ada@example.com"
      }
    });

    const result = await service.getMemberPermissions(
      "tenant-permission-test",
      "member-permission-test"
    );

    expect(result).toMatchObject({
      memberId: "member-permission-test",
      memberName: "Ada Admin",
      memberEmail: "ada@example.com",
      memberRole: "TENANT_ADMIN",
      customOverridesCount: 0
    });
    expect(result.items).toHaveLength(PERMISSIONS.length);
    expect(result.items.every((item) => item.isCustomOverride === false)).toBe(true);
  });

  it("rejects members outside the requested organization", async () => {
    tenantMemberFindUnique.mockResolvedValue({
      id: "other-member",
      tenantId: "other-tenant",
      userId: "other-user",
      role: "ADMIN",
      user: {
        name: "Other Admin",
        email: "other@example.com"
      }
    });

    await expect(
      service.getMemberPermissions("tenant-permission-test", "other-member")
    ).rejects.toThrow("Organization member not found");
  });

  it("lists workspace admins, members, and project managers alongside tenant admins", async () => {
    tenantMemberFindMany.mockResolvedValue([
      {
        userId: "owner-1",
        role: "OWNER",
        isActive: true,
        user: { id: "owner-1", name: "Avery Owner", email: "avery@example.com" }
      }
    ]);
    workspaceMemberFindMany.mockResolvedValue([
      {
        userId: "wa-1",
        role: "ADMIN",
        isActive: true,
        user: { id: "wa-1", name: "Casey Admin", email: "casey@example.com" }
      },
      {
        userId: "wm-1",
        role: "MEMBER",
        isActive: true,
        user: { id: "wm-1", name: "Sam Member", email: "sam@example.com" }
      }
    ]);
    teamMemberFindMany.mockResolvedValue([
      {
        userId: "pm-1",
        role: "PROJECT_MANAGER",
        isActive: true,
        user: { id: "pm-1", name: "Alex PM", email: "alex@example.com" }
      }
    ]);

    const result = await service.listPrincipalPolicies("tenant-1", { page: 1, limit: 25 });

    expect(result.total).toBe(4);
    expect(result.items.map((item) => item.displayName)).toEqual([
      "Alex PM",
      "Avery Owner",
      "Casey Admin",
      "Sam Member"
    ]);
    expect(result.items.find((item) => item.displayName === "Casey Admin")?.roles).toEqual([
      "WORKSPACE_ADMIN"
    ]);
    expect(result.items.find((item) => item.displayName === "Alex PM")?.roles).toEqual([
      "PROJECT_MANAGER"
    ]);
    expect(result.items.find((item) => item.displayName === "Sam Member")?.roles).toEqual([
      "WORKSPACE_MEMBER"
    ]);
    expect(result.items.find((item) => item.displayName === "Avery Owner")?.roles).toEqual([
      "TENANT_OWNER"
    ]);
  });

  it("merges roles when the same person has tenant and workspace bindings", async () => {
    tenantMemberFindMany.mockResolvedValue([
      {
        userId: "dual-1",
        role: "ADMIN",
        isActive: true,
        user: { id: "dual-1", name: "Morgan Dual", email: "morgan@example.com" }
      }
    ]);
    workspaceMemberFindMany.mockResolvedValue([
      {
        userId: "dual-1",
        role: "ADMIN",
        isActive: true,
        user: { id: "dual-1", name: "Morgan Dual", email: "morgan@example.com" }
      }
    ]);
    teamMemberFindMany.mockResolvedValue([]);

    const result = await service.listPrincipalPolicies("tenant-1", { page: 1, limit: 25 });

    expect(result.total).toBe(1);
    expect(result.items[0]?.roles).toEqual(["TENANT_ADMIN", "WORKSPACE_ADMIN"]);
  });
});
