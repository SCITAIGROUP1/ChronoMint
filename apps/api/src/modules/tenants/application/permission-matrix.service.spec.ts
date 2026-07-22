import { PERMISSIONS, POLICY_VERSION } from "@kloqra/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionMatrixService } from "./permission-matrix.service";

describe("PermissionMatrixService", () => {
  const tenantMemberFindUnique = vi.fn();
  const document = vi.fn();
  let service: PermissionMatrixService;

  beforeEach(() => {
    tenantMemberFindUnique.mockReset();
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
    service = new PermissionMatrixService(
      {
        tenantMember: {
          findUnique: tenantMemberFindUnique
        }
      } as never,
      {
        document
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
});
