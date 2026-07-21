import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { DomainException } from "../errors/domain.exception";
import { AuthorizationPolicyService } from "./authorization-policy.service";
import { ManagedRoleBindingsService } from "./managed-role-bindings.service";

type WorkspaceRoleGrant = {
  actorId: string;
  targetUserId: string;
  tenantId: string;
  workspaceId: string;
  currentRole: "ADMIN" | "MEMBER";
  requestedRole: "ADMIN" | "MEMBER";
};

type ProjectManagerGrant = {
  actorId: string;
  targetUserId: string;
  tenantId: string;
  workspaceId: string;
  projectId: string;
  currentRole: "MEMBER" | "PROJECT_MANAGER";
  requestedRole: "MEMBER" | "PROJECT_MANAGER";
};

type TenantRoleGrant = {
  actorId: string;
  targetUserId: string;
  tenantId: string;
  workspaceId: string;
};

@Injectable()
export class RoleGrantPolicyService {
  constructor(
    private evaluator: AuthorizationPolicyService,
    private bindings: ManagedRoleBindingsService
  ) {}

  /**
   * Assert that the acting user may assign or remove a workspace-admin binding
   * within the given tenant. Delegates to the authoritative evaluator using the
   * actor's tenant bindings rather than a direct role string check.
   *
   * Callers (e.g. workspace.service.ts tenant-operator paths) should use this
   * instead of `requireTenantOwnerOrAdmin` so authorization flows through a
   * single, auditable path.
   */
  async assertTenantRoleGrant(
    input: TenantRoleGrant,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    if (input.actorId === input.targetUserId) {
      this.deny("You cannot change your own workspace-admin assignment");
    }

    const bindingSet = await this.bindings.forTenant(
      { principalId: input.actorId, tenantId: input.tenantId },
      tx
    );
    this.evaluator.assertAllowed({
      principalId: input.actorId,
      permission: "tenant:ManageWorkspaceAdmins",
      resource: {
        scope: "tenant",
        id: input.tenantId,
        tenantId: input.tenantId
      },
      bindings: bindingSet.bindings,
      context: { tenantIsolationPassed: bindingSet.isolationPassed }
    });
  }

  async assertWorkspaceRoleGrant(
    input: WorkspaceRoleGrant,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    if (
      input.actorId === input.targetUserId &&
      input.currentRole !== "ADMIN" &&
      input.requestedRole === "ADMIN"
    ) {
      this.deny("You cannot grant yourself broader workspace access");
    }

    const bindingSet = await this.bindings.forWorkspace(
      {
        principalId: input.actorId,
        tenantId: input.tenantId,
        workspaceId: input.workspaceId
      },
      tx
    );
    this.evaluator.assertAllowed({
      principalId: input.actorId,
      permission: "workspace:ManageMembers",
      resource: {
        scope: "workspace",
        id: input.workspaceId,
        workspaceId: input.workspaceId,
        tenantId: input.tenantId
      },
      bindings: bindingSet.bindings,
      context: { tenantIsolationPassed: bindingSet.isolationPassed }
    });
  }

  async assertProjectManagerGrant(
    input: ProjectManagerGrant,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    if (
      input.actorId === input.targetUserId &&
      input.currentRole !== "PROJECT_MANAGER" &&
      input.requestedRole === "PROJECT_MANAGER"
    ) {
      this.deny("You cannot grant yourself broader project access");
    }

    const bindingSet = await this.bindings.forProject(
      {
        principalId: input.actorId,
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        projectId: input.projectId
      },
      tx
    );
    const decision = this.evaluator.assertAllowed({
      principalId: input.actorId,
      permission: "project:ManageTeam",
      resource: {
        scope: "project",
        id: input.projectId,
        projectId: input.projectId,
        workspaceId: input.workspaceId,
        tenantId: input.tenantId
      },
      bindings: bindingSet.bindings,
      context: { tenantIsolationPassed: bindingSet.isolationPassed }
    });

    // Preserve the existing stricter boundary: project managers may manage a
    // roster, but only workspace admins may create another manager.
    if (!decision.allowed || decision.role !== "WORKSPACE_ADMIN") {
      this.deny("Only workspace admins can change project manager roles");
    }
  }

  private deny(message: string): never {
    throw new DomainException(ErrorCodes.FORBIDDEN, message, HttpStatus.FORBIDDEN);
  }
}
