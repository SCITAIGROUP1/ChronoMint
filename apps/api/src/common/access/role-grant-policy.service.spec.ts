import { ErrorCodes } from "@kloqra/contracts";
import { describe, expect, it, vi } from "vitest";
import { DomainException } from "../errors/domain.exception";
import { AuthorizationPolicyService } from "./authorization-policy.service";
import { RoleGrantPolicyService } from "./role-grant-policy.service";

describe("RoleGrantPolicyService", () => {
  const evaluator = new AuthorizationPolicyService();

  it("allows a workspace admin to grant workspace membership in the same workspace", async () => {
    const bindings = {
      forWorkspace: vi.fn().mockResolvedValue({
        isolationPassed: true,
        bindings: [{ role: "WORKSPACE_ADMIN", resourceId: "workspace-1" }]
      })
    };
    const service = new RoleGrantPolicyService(evaluator, bindings as never);

    await expect(
      service.assertWorkspaceRoleGrant({
        actorId: "admin-1",
        targetUserId: "member-1",
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        currentRole: "MEMBER",
        requestedRole: "ADMIN"
      })
    ).resolves.toBeUndefined();
  });

  it("denies self-promotion even when a stale binding appears privileged", async () => {
    const bindings = {
      forWorkspace: vi.fn().mockResolvedValue({
        isolationPassed: true,
        bindings: [{ role: "WORKSPACE_ADMIN", resourceId: "workspace-1" }]
      })
    };
    const service = new RoleGrantPolicyService(evaluator, bindings as never);

    await expect(
      service.assertWorkspaceRoleGrant({
        actorId: "user-1",
        targetUserId: "user-1",
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        currentRole: "MEMBER",
        requestedRole: "ADMIN"
      })
    ).rejects.toMatchObject({ code: ErrorCodes.FORBIDDEN });
  });

  it("denies a project manager granting PROJECT_MANAGER to another user", async () => {
    const bindings = {
      forProject: vi.fn().mockResolvedValue({
        isolationPassed: true,
        bindings: [
          { role: "WORKSPACE_MEMBER", resourceId: "workspace-1" },
          { role: "PROJECT_MANAGER", resourceId: "project-1" }
        ]
      })
    };
    const service = new RoleGrantPolicyService(evaluator, bindings as never);

    await expect(
      service.assertProjectManagerGrant({
        actorId: "manager-1",
        targetUserId: "member-1",
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        projectId: "project-1",
        currentRole: "MEMBER",
        requestedRole: "PROJECT_MANAGER"
      })
    ).rejects.toBeInstanceOf(DomainException);
  });

  it("denies a workspace-admin grant when the project resolves outside its tenant", async () => {
    const bindings = {
      forProject: vi.fn().mockResolvedValue({
        isolationPassed: false,
        bindings: [{ role: "WORKSPACE_ADMIN", resourceId: "workspace-1" }]
      })
    };
    const service = new RoleGrantPolicyService(evaluator, bindings as never);

    await expect(
      service.assertProjectManagerGrant({
        actorId: "admin-1",
        targetUserId: "member-1",
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        projectId: "project-1",
        currentRole: "MEMBER",
        requestedRole: "PROJECT_MANAGER"
      })
    ).rejects.toMatchObject({ code: ErrorCodes.FORBIDDEN });
  });

  it("allows a tenant admin to grant workspace-admin role in their own tenant", async () => {
    const bindings = {
      forTenant: vi.fn().mockResolvedValue({
        isolationPassed: true,
        bindings: [{ role: "TENANT_ADMIN", resourceId: "tenant-1" }]
      })
    };
    const service = new RoleGrantPolicyService(evaluator, bindings as never);

    await expect(
      service.assertTenantRoleGrant({
        actorId: "admin-1",
        targetUserId: "member-1",
        tenantId: "tenant-1",
        workspaceId: "workspace-1"
      })
    ).resolves.toBeUndefined();
  });

  it("denies a tenant admin grant when isolation fails (foreign tenant)", async () => {
    const bindings = {
      forTenant: vi.fn().mockResolvedValue({
        isolationPassed: false,
        bindings: [{ role: "TENANT_ADMIN", resourceId: "tenant-1" }]
      })
    };
    const service = new RoleGrantPolicyService(evaluator, bindings as never);

    await expect(
      service.assertTenantRoleGrant({
        actorId: "admin-1",
        targetUserId: "member-1",
        tenantId: "tenant-1",
        workspaceId: "workspace-1"
      })
    ).rejects.toMatchObject({ code: ErrorCodes.FORBIDDEN });
  });

  it("denies self-modification of workspace-admin assignment", async () => {
    const bindings = {
      forTenant: vi.fn().mockResolvedValue({
        isolationPassed: true,
        bindings: [{ role: "TENANT_ADMIN", resourceId: "tenant-1" }]
      })
    };
    const service = new RoleGrantPolicyService(evaluator, bindings as never);

    await expect(
      service.assertTenantRoleGrant({
        actorId: "admin-1",
        targetUserId: "admin-1", // same actor
        tenantId: "tenant-1",
        workspaceId: "workspace-1"
      })
    ).rejects.toMatchObject({ code: ErrorCodes.FORBIDDEN });
  });
});
