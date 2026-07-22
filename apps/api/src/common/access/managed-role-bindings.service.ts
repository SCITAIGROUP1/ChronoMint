import type { ManagedRole, ResourceScope } from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { ManagedRoleBinding } from "./authorization-policy.service";

export type ManagedRoleBindingSet = {
  isolationPassed: boolean;
  bindings: ManagedRoleBinding[];
};

type ResourceContext = {
  principalId: string;
  tenantId?: string;
  workspaceId: string;
};

type RoleBindingDb = Pick<
  Prisma.TransactionClient,
  "platformUser" | "tenantMember" | "workspace" | "workspaceMember" | "project" | "teamMember"
>;

@Injectable()
export class ManagedRoleBindingsService {
  constructor(private prisma: PrismaService) {}

  async forPlatform(
    context: { principalId: string },
    db: RoleBindingDb = this.prisma
  ): Promise<ManagedRoleBindingSet> {
    const user = await db.platformUser.findUnique({
      where: { id: context.principalId },
      select: { role: true, isActive: true }
    });
    if (!user?.isActive) return { isolationPassed: true, bindings: [] };

    const role =
      user.role === "SUPERADMIN"
        ? "PLATFORM_SUPERADMIN"
        : user.role === "SUPPORT"
          ? "PLATFORM_SUPPORT"
          : undefined;
    return {
      isolationPassed: true,
      bindings: role ? [this.binding(role, "platform", "platform")] : []
    };
  }

  async forTenant(
    context: { principalId: string; tenantId: string },
    db: RoleBindingDb = this.prisma
  ): Promise<ManagedRoleBindingSet> {
    const membership = await db.tenantMember.findUnique({
      where: { userId: context.principalId },
      select: { tenantId: true, role: true, isActive: true }
    });
    if (!membership || membership.tenantId !== context.tenantId) {
      return { isolationPassed: false, bindings: [] };
    }
    if (!membership.isActive) return { isolationPassed: true, bindings: [] };

    const role =
      membership.role === "OWNER"
        ? "TENANT_OWNER"
        : membership.role === "ADMIN"
          ? "TENANT_ADMIN"
          : undefined;
    return {
      isolationPassed: true,
      bindings: role ? [this.binding(role, context.tenantId, "tenant")] : []
    };
  }

  async forWorkspace(
    context: ResourceContext,
    db: RoleBindingDb = this.prisma
  ): Promise<ManagedRoleBindingSet> {
    const workspace = await db.workspace.findUnique({
      where: { id: context.workspaceId },
      select: { id: true, tenantId: true }
    });
    if (!workspace || (context.tenantId && workspace.tenantId !== context.tenantId)) {
      return { isolationPassed: false, bindings: [] };
    }

    const membership = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: context.workspaceId,
          userId: context.principalId
        }
      },
      select: { role: true, isActive: true }
    });
    if (!membership?.isActive) {
      return { isolationPassed: true, bindings: [] };
    }

    const role = this.workspaceRole(membership.role);
    return {
      isolationPassed: true,
      bindings: role ? [this.binding(role, context.workspaceId, "workspace")] : []
    };
  }

  async forProject(
    context: ResourceContext & { projectId: string },
    db: RoleBindingDb = this.prisma
  ): Promise<ManagedRoleBindingSet> {
    const project = await db.project.findFirst({
      where: { id: context.projectId, workspaceId: context.workspaceId },
      select: {
        id: true,
        workspaceId: true,
        isActive: true,
        workspace: { select: { tenantId: true } }
      }
    });
    if (!project || (context.tenantId && project.workspace.tenantId !== context.tenantId)) {
      return { isolationPassed: false, bindings: [] };
    }

    const workspaceMembership = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: context.workspaceId,
          userId: context.principalId
        }
      },
      select: { role: true, isActive: true }
    });
    if (!workspaceMembership?.isActive) {
      return { isolationPassed: true, bindings: [] };
    }

    const bindings: ManagedRoleBinding[] = [];
    const workspaceRole = this.workspaceRole(workspaceMembership.role);
    if (workspaceRole) {
      bindings.push(this.binding(workspaceRole, context.workspaceId, "workspace"));
    }

    if (project.isActive) {
      const projectMembership = await db.teamMember.findFirst({
        where: {
          userId: context.principalId,
          role: "PROJECT_MANAGER",
          isActive: true,
          team: { projectId: context.projectId }
        },
        select: { role: true, isActive: true }
      });
      if (projectMembership?.role === "PROJECT_MANAGER" && projectMembership.isActive) {
        bindings.push(this.binding("PROJECT_MANAGER", context.projectId, "project"));
      }
    }

    return { isolationPassed: true, bindings };
  }

  private workspaceRole(role: string): ManagedRole | undefined {
    if (role === "ADMIN") return "WORKSPACE_ADMIN";
    if (role === "MEMBER") return "WORKSPACE_MEMBER";
    return undefined;
  }

  private binding(
    role: ManagedRole,
    resourceId: string,
    bindingScope: ResourceScope
  ): ManagedRoleBinding {
    return { role, resourceId, bindingScope, active: true };
  }
}
