import { describe, expect, it, vi } from "vitest";
import { ManagedRoleBindingsService } from "./managed-role-bindings.service";

describe("ManagedRoleBindingsService", () => {
  it("maps active tenant and platform role sources to managed roles", async () => {
    const prisma = {
      tenantMember: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ tenantId: "tenant-1", role: "OWNER", isActive: true })
      },
      platformUser: {
        findUnique: vi.fn().mockResolvedValue({ role: "SUPPORT", isActive: true })
      }
    };
    const service = new ManagedRoleBindingsService(prisma as never);

    await expect(
      service.forTenant({ principalId: "owner-1", tenantId: "tenant-1" })
    ).resolves.toEqual({
      isolationPassed: true,
      bindings: [
        {
          role: "TENANT_OWNER",
          resourceId: "tenant-1",
          bindingScope: "tenant",
          active: true
        }
      ]
    });
    await expect(service.forPlatform({ principalId: "support-1" })).resolves.toEqual({
      isolationPassed: true,
      bindings: [
        {
          role: "PLATFORM_SUPPORT",
          resourceId: "platform",
          bindingScope: "platform",
          active: true
        }
      ]
    });
  });

  it("creates authoritative workspace and project bindings for an active member", async () => {
    const prisma = {
      project: {
        findFirst: vi.fn().mockResolvedValue({
          id: "project-1",
          workspaceId: "workspace-1",
          isActive: true,
          workspace: { tenantId: "tenant-1" }
        })
      },
      workspaceMember: {
        findUnique: vi.fn().mockResolvedValue({ role: "MEMBER", isActive: true })
      },
      teamMember: {
        findFirst: vi.fn().mockResolvedValue({ role: "PROJECT_MANAGER", isActive: true })
      }
    };

    const result = await new ManagedRoleBindingsService(prisma as never).forProject({
      principalId: "user-1",
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      projectId: "project-1"
    });

    expect(result).toEqual({
      isolationPassed: true,
      bindings: [
        {
          role: "WORKSPACE_MEMBER",
          resourceId: "workspace-1",
          bindingScope: "workspace",
          active: true
        },
        {
          role: "PROJECT_MANAGER",
          resourceId: "project-1",
          bindingScope: "project",
          active: true
        }
      ]
    });
  });

  it("denies cross-tenant project context before reading memberships", async () => {
    const prisma = {
      project: {
        findFirst: vi.fn().mockResolvedValue({
          id: "project-1",
          workspaceId: "workspace-1",
          isActive: true,
          workspace: { tenantId: "tenant-2" }
        })
      },
      workspaceMember: { findUnique: vi.fn() },
      teamMember: { findFirst: vi.fn() }
    };

    const result = await new ManagedRoleBindingsService(prisma as never).forProject({
      principalId: "user-1",
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      projectId: "project-1"
    });

    expect(result).toEqual({ isolationPassed: false, bindings: [] });
    expect(prisma.workspaceMember.findUnique).not.toHaveBeenCalled();
    expect(prisma.teamMember.findFirst).not.toHaveBeenCalled();
  });

  it("does not bind a project manager when workspace membership is inactive", async () => {
    const prisma = {
      project: {
        findFirst: vi.fn().mockResolvedValue({
          id: "project-1",
          workspaceId: "workspace-1",
          isActive: true,
          workspace: { tenantId: "tenant-1" }
        })
      },
      workspaceMember: {
        findUnique: vi.fn().mockResolvedValue({ role: "MEMBER", isActive: false })
      },
      teamMember: { findFirst: vi.fn() }
    };

    const result = await new ManagedRoleBindingsService(prisma as never).forProject({
      principalId: "user-1",
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      projectId: "project-1"
    });

    expect(result).toEqual({ isolationPassed: true, bindings: [] });
    expect(prisma.teamMember.findFirst).not.toHaveBeenCalled();
  });
});
