import {
  ErrorCodes,
  getPermissionMeta,
  POLICY_CHECKSUM,
  POLICY_VERSION,
  type Permission,
  type ResourceScope
} from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { DomainException } from "../errors/domain.exception";
import { AccessPolicyRepository } from "./access-policy.repository";
import {
  AuthorizationPolicyService,
  type AuthorizationDecision,
  type AuthorizationResource,
  type ManagedRoleBinding,
  type PrincipalPermissionOverride,
  type RolePermissionOverride
} from "./authorization-policy.service";
import {
  ManagedRoleBindingsService,
  type ManagedRoleBindingSet
} from "./managed-role-bindings.service";

export type AuthorizationResourceLocator =
  | { scope: "platform" }
  | { scope: "tenant"; tenantId: string }
  | { scope: "workspace"; workspaceId: string; expectedTenantId?: string }
  | {
      scope: "project";
      projectId: string;
      expectedWorkspaceId?: string;
      expectedTenantId?: string;
    }
  | { scope: "self"; workspaceId?: string; tenantId?: string };

export interface AuthorizationEnforcementRequest {
  principalId: string;
  permission: Permission;
  resource: AuthorizationResourceLocator;
}

type EnforcementDb = Prisma.TransactionClient;

type ResolvedContext = {
  resource: AuthorizationResource;
  tenantId?: string;
  accountActive: boolean;
  subscriptionAllows: boolean;
  subscriptionStatus?: string;
  bindingSet: ManagedRoleBindingSet;
};

const ACTIVE_TENANT_STATUSES = new Set(["active", "pending_setup"]);
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trial", "trialing"]);

@Injectable()
export class AuthorizationEnforcementService {
  constructor(
    private readonly repository: AccessPolicyRepository,
    private readonly bindings: ManagedRoleBindingsService,
    private readonly evaluator: AuthorizationPolicyService
  ) {}

  async evaluate(
    request: AuthorizationEnforcementRequest,
    db?: EnforcementDb
  ): Promise<AuthorizationDecision> {
    const run = async (tx: EnforcementDb) => {
      const resolved = await this.resolve(request, tx);
      if (request.resource.scope === "platform") {
        return this.evaluator.evaluate({
          principalId: request.principalId,
          permission: request.permission,
          resource: resolved.resource,
          bindings: resolved.bindingSet.bindings,
          context: {
            tenantIsolationPassed: resolved.bindingSet.isolationPassed,
            accountActive: resolved.accountActive,
            subscriptionAllows: true
          },
          policyState: {
            policyVersion: POLICY_VERSION,
            policyChecksum: POLICY_CHECKSUM,
            revision: 0
          }
        });
      }

      const snapshot = resolved.tenantId
        ? await this.repository.loadEvaluationSnapshot(
            {
              tenantId: resolved.tenantId,
              principalId: request.principalId,
              permission: request.permission,
              resource: resolved.resource,
              bindings: resolved.bindingSet.bindings
            },
            tx
          )
        : undefined;
      const validOverrides = snapshot
        ? this.mapOverrides(snapshot, resolved.bindingSet.bindings)
        : { valid: true, roleOverrides: [], principalOverrides: [] };

      const decision = this.evaluator.evaluate({
        principalId: request.principalId,
        permission: request.permission,
        resource: resolved.resource,
        bindings: resolved.bindingSet.bindings,
        context: {
          tenantIsolationPassed: resolved.bindingSet.isolationPassed,
          accountActive: resolved.accountActive,
          subscriptionAllows: resolved.subscriptionAllows
        },
        policyState: snapshot?.state
          ? {
              policyVersion: snapshot.state.policyVersion,
              policyChecksum: validOverrides.valid ? snapshot.state.policyChecksum : "invalid",
              revision: snapshot.state.revision
            }
          : undefined,
        roleOverrides: validOverrides.roleOverrides,
        principalOverrides: validOverrides.principalOverrides
      });
      if (decision.reason === "subscription_blocked" && resolved.subscriptionStatus) {
        return { ...decision, subscriptionStatus: resolved.subscriptionStatus };
      }
      return decision;
    };

    return db ? run(db) : this.repository.transaction(run);
  }

  async assertAllowed(
    request: AuthorizationEnforcementRequest,
    db?: EnforcementDb
  ): Promise<AuthorizationDecision> {
    const decision = await this.evaluate(request, db);
    if (!decision.allowed) {
      if (decision.reason === "subscription_blocked") {
        throw new DomainException(
          ErrorCodes.PAYMENT_REQUIRED,
          "Subscription payment is required to perform this action",
          HttpStatus.PAYMENT_REQUIRED,
          { status: decision.subscriptionStatus ?? "unknown" }
        );
      }
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Insufficient permissions",
        HttpStatus.FORBIDDEN,
        {
          reason: decision.reason,
          source: decision.source,
          policyVersion: decision.policyVersion,
          policyRevision: decision.policyRevision,
          permission: request.permission,
          resourceScope: request.resource.scope
        }
      );
    }
    return decision;
  }

  private async resolve(
    request: AuthorizationEnforcementRequest,
    db: EnforcementDb
  ): Promise<ResolvedContext> {
    switch (request.resource.scope) {
      case "platform": {
        const bindingSet = await this.bindings.forPlatform(
          { principalId: request.principalId },
          db
        );
        return {
          resource: { scope: "platform", id: "platform" },
          accountActive: bindingSet.bindings.length > 0,
          subscriptionAllows: true,
          bindingSet
        };
      }
      case "tenant": {
        const tenant = await db.tenant.findUnique({
          where: { id: request.resource.tenantId },
          select: { id: true, status: true, subscription: { select: { status: true } } }
        });
        const bindingSet = await this.bindings.forTenant(
          { principalId: request.principalId, tenantId: request.resource.tenantId },
          db
        );
        return this.tenantContext(
          request.permission,
          tenant,
          {
            scope: "tenant",
            id: request.resource.tenantId,
            tenantId: request.resource.tenantId
          },
          bindingSet
        );
      }
      case "workspace": {
        const workspace = await db.workspace.findUnique({
          where: { id: request.resource.workspaceId },
          select: {
            id: true,
            tenantId: true,
            tenant: {
              select: { status: true, subscription: { select: { status: true } } }
            }
          }
        });
        const trusted =
          workspace &&
          (!request.resource.expectedTenantId ||
            request.resource.expectedTenantId === workspace.tenantId);
        const bindingSet = trusted
          ? await this.bindings.forWorkspace(
              {
                principalId: request.principalId,
                tenantId: workspace.tenantId,
                workspaceId: workspace.id
              },
              db
            )
          : { isolationPassed: false, bindings: [] };
        return this.tenantContext(
          request.permission,
          trusted
            ? {
                id: workspace.tenantId,
                status: workspace.tenant.status,
                subscription: workspace.tenant.subscription
              }
            : null,
          {
            scope: "workspace",
            id: request.resource.workspaceId,
            workspaceId: request.resource.workspaceId,
            tenantId: workspace?.tenantId
          },
          bindingSet
        );
      }
      case "project": {
        const project = await db.project.findUnique({
          where: { id: request.resource.projectId },
          select: {
            id: true,
            workspaceId: true,
            workspace: {
              select: {
                tenantId: true,
                tenant: {
                  select: { status: true, subscription: { select: { status: true } } }
                }
              }
            }
          }
        });
        const trusted =
          project &&
          (!request.resource.expectedWorkspaceId ||
            request.resource.expectedWorkspaceId === project.workspaceId) &&
          (!request.resource.expectedTenantId ||
            request.resource.expectedTenantId === project.workspace.tenantId);
        const bindingSet = trusted
          ? await this.bindings.forProject(
              {
                principalId: request.principalId,
                tenantId: project.workspace.tenantId,
                workspaceId: project.workspaceId,
                projectId: project.id
              },
              db
            )
          : { isolationPassed: false, bindings: [] };
        return this.tenantContext(
          request.permission,
          trusted
            ? {
                id: project.workspace.tenantId,
                status: project.workspace.tenant.status,
                subscription: project.workspace.tenant.subscription
              }
            : null,
          {
            scope: "project",
            id: request.resource.projectId,
            projectId: request.resource.projectId,
            workspaceId: project?.workspaceId,
            tenantId: project?.workspace.tenantId
          },
          bindingSet
        );
      }
      case "self":
        return this.resolveSelf(request.principalId, request.permission, request.resource, db);
    }
  }

  private async resolveSelf(
    principalId: string,
    permission: Permission,
    resource: Extract<AuthorizationResourceLocator, { scope: "self" }>,
    db: EnforcementDb
  ): Promise<ResolvedContext> {
    if (resource.workspaceId) {
      const workspace = await db.workspace.findUnique({
        where: { id: resource.workspaceId },
        select: {
          id: true,
          tenantId: true,
          tenant: {
            select: { status: true, subscription: { select: { status: true } } }
          }
        }
      });
      const trusted = workspace && (!resource.tenantId || resource.tenantId === workspace.tenantId);
      const bindingSet = trusted
        ? await this.bindings.forWorkspace(
            {
              principalId,
              tenantId: workspace.tenantId,
              workspaceId: workspace.id
            },
            db
          )
        : { isolationPassed: false, bindings: [] };
      return this.tenantContext(
        permission,
        trusted
          ? {
              id: workspace.tenantId,
              status: workspace.tenant.status,
              subscription: workspace.tenant.subscription
            }
          : null,
        {
          scope: "self",
          id: principalId,
          ownerUserId: principalId,
          workspaceId: workspace?.id,
          tenantId: workspace?.tenantId
        },
        bindingSet
      );
    }

    const tenantId = resource.tenantId ?? "";
    const tenant = tenantId
      ? await db.tenant.findUnique({
          where: { id: tenantId },
          select: { id: true, status: true, subscription: { select: { status: true } } }
        })
      : null;
    const bindingSet = tenant
      ? await this.bindings.forTenant({ principalId, tenantId }, db)
      : { isolationPassed: false, bindings: [] };
    return this.tenantContext(
      permission,
      tenant,
      {
        scope: "self",
        id: principalId,
        ownerUserId: principalId,
        tenantId: tenant?.id
      },
      bindingSet
    );
  }

  private tenantContext(
    permission: Permission,
    tenant: {
      id: string;
      status: string;
      subscription: { status: string } | null;
    } | null,
    resource: AuthorizationResource,
    bindingSet: ManagedRoleBindingSet
  ): ResolvedContext {
    return {
      resource,
      tenantId: tenant?.id,
      accountActive: !!tenant && ACTIVE_TENANT_STATUSES.has(tenant.status),
      subscriptionAllows:
        getPermissionMeta(permission).actionDimension === "VIEW" ||
        (!!tenant?.subscription && ACTIVE_SUBSCRIPTION_STATUSES.has(tenant.subscription.status)),
      subscriptionStatus: tenant?.subscription?.status,
      bindingSet: tenant ? bindingSet : { isolationPassed: false, bindings: [] }
    };
  }

  private mapOverrides(
    snapshot: Awaited<ReturnType<AccessPolicyRepository["loadEvaluationSnapshot"]>>,
    bindings: readonly ManagedRoleBinding[]
  ): {
    valid: boolean;
    roleOverrides?: RolePermissionOverride[];
    principalOverrides?: PrincipalPermissionOverride[];
  } {
    const roleOverrides: RolePermissionOverride[] = [];
    const principalOverrides: PrincipalPermissionOverride[] = [];
    let valid = true;

    for (const row of snapshot.roleOverrides) {
      const binding = bindings.find(
        (candidate) =>
          candidate.role === row.role &&
          candidate.bindingScope === row.scope &&
          candidate.resourceId === row.resourceId
      );
      if (!binding || (row.effect !== "allow" && row.effect !== "deny")) {
        valid = false;
        continue;
      }
      roleOverrides.push({
        role: binding.role,
        permission: row.permission as Permission,
        effect: row.effect,
        scope: row.scope as ResourceScope,
        resourceId: row.resourceId
      });
    }
    for (const row of snapshot.principalOverrides) {
      if (row.effect !== "allow" && row.effect !== "deny") {
        valid = false;
        continue;
      }
      principalOverrides.push({
        principalId: row.principalId,
        permission: row.permission as Permission,
        effect: row.effect,
        scope: row.scope as ResourceScope,
        resourceId: row.resourceId
      });
    }
    return { valid, roleOverrides, principalOverrides };
  }
}
