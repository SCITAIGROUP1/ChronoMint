import { randomUUID } from "node:crypto";
import {
  ErrorCodes,
  getPermissionMeta,
  MANAGED_ROLE_BINDING_SCOPES,
  MANAGED_ROLE_POLICIES,
  MANAGED_ROLE_POLICY_METADATA,
  PERMISSIONS,
  POLICY_VERSION,
  type BatchPolicyMutationDto,
  type ManagedRole,
  type MemberPermissionsDto,
  type PermissionCatalogItemDto,
  type PermissionMatrixDto,
  type PolicyDirectoryQueryDto,
  type PolicyMutationResultDto,
  type PolicyTargetDto,
  type PrincipalPolicyDirectoryDto,
  type ResetPolicyDto,
  type ResourceScope,
  type RolePolicyDirectoryDto,
  type UpdateMemberPermissionDto,
  type UpdatePermissionMatrixPolicyDto
} from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { AccessPolicyService } from "../../../common/access/access-policy.service";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";

const TENANT_STUDIO_ROLES: ManagedRole[] = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "WORKSPACE_ADMIN",
  "WORKSPACE_MEMBER",
  "PROJECT_MANAGER"
];

@Injectable()
export class PermissionMatrixService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: AccessPolicyService
  ) {}

  getCatalog(): PermissionCatalogItemDto[] {
    return PERMISSIONS.map((id) => {
      const meta = getPermissionMeta(id);
      return {
        id,
        label: meta.label,
        description: meta.description,
        resourceScope: meta.resourceScope,
        resourceFamily: meta.resourceFamily,
        parentGroup: meta.parentGroup,
        actionDimension: meta.actionDimension,
        riskLevel: meta.riskLevel,
        customizable: meta.customizable,
        applicableTargetRoles: [...meta.applicableTargetRoles],
        lifecycle: meta.lifecycle,
        enforcementStatus: meta.enforcementStatus
      };
    });
  }

  requireExplicitTarget(query: PolicyDirectoryQueryDto): {
    scope: ResourceScope;
    resourceId: string;
  } {
    if (!query.scope || !query.resourceId) {
      this.validation("scope and resourceId query parameters are required");
    }
    return { scope: query.scope, resourceId: query.resourceId };
  }

  rejectRouteTargetMismatch(): never {
    this.validation("Route identity does not match the policy target");
  }

  async listRolePolicies(
    tenantId: string,
    query: PolicyDirectoryQueryDto
  ): Promise<RolePolicyDirectoryDto> {
    const target = await this.resolveDirectoryTarget(tenantId, query);
    const search = query.search?.toLowerCase();
    const roles = TENANT_STUDIO_ROLES.filter(
      (role) =>
        MANAGED_ROLE_BINDING_SCOPES[role] === target.scope &&
        (!search || this.roleDisplayName(role).toLowerCase().includes(search))
    );
    const total = roles.length;
    const pageRoles = roles.slice((query.page - 1) * query.limit, query.page * query.limit);
    const counts = pageRoles.length
      ? await this.prisma.tenantRolePermissionOverride.groupBy({
          by: ["role"],
          where: {
            tenantId,
            scope: target.scope,
            resourceId: target.resourceId,
            role: { in: pageRoles }
          },
          _count: { _all: true }
        })
      : [];
    const countByRole = new Map(counts.map((row) => [row.role, row._count._all]));
    return {
      items: pageRoles.map((role) => ({
        target: { type: "ROLE", role, ...target },
        displayName: this.roleDisplayName(role),
        immutable: MANAGED_ROLE_POLICY_METADATA[role].immutable,
        customizationEnabled: MANAGED_ROLE_POLICY_METADATA[role].customizationEnabled,
        overrideCount: countByRole.get(role) ?? 0
      })),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    };
  }

  async listPrincipalPolicies(
    tenantId: string,
    query: PolicyDirectoryQueryDto
  ): Promise<PrincipalPolicyDirectoryDto> {
    const target = await this.resolveDirectoryTarget(tenantId, query);
    const candidates = await this.collectPrincipalCandidates(tenantId, target, query.search);
    const total = candidates.length;
    const pageItems = candidates.slice((query.page - 1) * query.limit, query.page * query.limit);
    const principalIds = pageItems.map((item) => item.userId);
    const counts = principalIds.length
      ? await this.prisma.principalPermissionOverride.groupBy({
          by: ["principalId"],
          where: {
            tenantId,
            principalId: { in: principalIds },
            scope: target.scope,
            resourceId: target.resourceId
          },
          _count: { _all: true }
        })
      : [];
    const countByPrincipal = new Map(counts.map((row) => [row.principalId, row._count._all]));
    return {
      items: pageItems.map((item) => ({
        target: {
          type: "PRINCIPAL" as const,
          principalId: item.userId,
          ...target
        },
        displayName: item.displayName,
        email: item.email,
        active: item.active,
        roles: item.roles,
        overrideCount: countByPrincipal.get(item.userId) ?? 0
      })),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 0
    };
  }

  /**
   * Union org owners/admins with workspace members/admins and project managers so
   * Member overrides is not limited to tenant_members rows.
   */
  private async collectPrincipalCandidates(
    tenantId: string,
    target: { scope: ResourceScope; resourceId: string },
    search?: string
  ): Promise<
    Array<{
      userId: string;
      displayName: string;
      email: string;
      active: boolean;
      roles: ManagedRole[];
    }>
  > {
    const searchFilter = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } }
          ]
        }
      : undefined;

    const [tenantMembers, workspaceMembers, projectManagers] = await Promise.all([
      this.prisma.tenantMember.findMany({
        where: {
          tenantId,
          ...(target.scope === "self" ? { userId: target.resourceId } : {}),
          ...(searchFilter ? { user: searchFilter } : {})
        },
        include: { user: true }
      }),
      target.scope === "self"
        ? Promise.resolve([])
        : this.prisma.workspaceMember.findMany({
            where: {
              isActive: true,
              ...(target.scope === "workspace"
                ? { workspaceId: target.resourceId }
                : target.scope === "project"
                  ? { workspace: { projects: { some: { id: target.resourceId } } } }
                  : { workspace: { tenantId } }),
              ...(searchFilter ? { user: searchFilter } : {})
            },
            include: { user: true }
          }),
      target.scope === "self"
        ? Promise.resolve([])
        : this.prisma.teamMember.findMany({
            where: {
              isActive: true,
              role: "PROJECT_MANAGER",
              ...(target.scope === "project"
                ? { team: { projectId: target.resourceId } }
                : target.scope === "workspace"
                  ? { team: { project: { workspaceId: target.resourceId } } }
                  : { team: { project: { workspace: { tenantId } } } }),
              ...(searchFilter ? { user: searchFilter } : {})
            },
            include: { user: true }
          })
    ]);

    type Acc = {
      userId: string;
      displayName: string;
      email: string;
      active: boolean;
      roleSet: Set<ManagedRole>;
    };
    const byUserId = new Map<string, Acc>();

    const ensure = (user: { id: string; name: string; email: string }, active: boolean) => {
      const existing = byUserId.get(user.id);
      if (existing) {
        existing.active = existing.active || active;
        return existing;
      }
      const created: Acc = {
        userId: user.id,
        displayName: user.name,
        email: user.email,
        active,
        roleSet: new Set()
      };
      byUserId.set(user.id, created);
      return created;
    };

    for (const member of tenantMembers) {
      const entry = ensure(member.user, member.isActive);
      entry.roleSet.add(member.role === "OWNER" ? "TENANT_OWNER" : "TENANT_ADMIN");
    }
    for (const member of workspaceMembers) {
      const entry = ensure(member.user, member.isActive);
      entry.roleSet.add(member.role === "ADMIN" ? "WORKSPACE_ADMIN" : "WORKSPACE_MEMBER");
    }
    for (const member of projectManagers) {
      const entry = ensure(member.user, member.isActive);
      entry.roleSet.add("PROJECT_MANAGER");
    }

    const roleRank: Record<ManagedRole, number> = {
      TENANT_OWNER: 0,
      TENANT_ADMIN: 1,
      WORKSPACE_ADMIN: 2,
      PROJECT_MANAGER: 3,
      WORKSPACE_MEMBER: 4,
      PLATFORM_SUPERADMIN: 5,
      PLATFORM_SUPPORT: 6
    };

    return [...byUserId.values()]
      .map((entry) => ({
        userId: entry.userId,
        displayName: entry.displayName,
        email: entry.email,
        active: entry.active,
        roles: [...entry.roleSet].sort((a, b) => (roleRank[a] ?? 99) - (roleRank[b] ?? 99))
      }))
      .sort(
        (a, b) => a.displayName.localeCompare(b.displayName) || a.userId.localeCompare(b.userId)
      );
  }

  getRolePolicy(tenantId: string, role: ManagedRole, scope: ResourceScope, resourceId: string) {
    return this.accessPolicy.document(tenantId, {
      type: "ROLE",
      role,
      scope,
      resourceId
    });
  }

  getPrincipalPolicy(
    tenantId: string,
    principalId: string,
    scope: ResourceScope,
    resourceId: string
  ) {
    return this.accessPolicy.document(tenantId, {
      type: "PRINCIPAL",
      principalId,
      scope,
      resourceId
    });
  }

  async mutate(
    actorUserId: string,
    tenantId: string,
    request: BatchPolicyMutationDto
  ): Promise<PolicyMutationResultDto> {
    await this.assertActorCanManage(actorUserId, tenantId, request.mutations[0]?.target);
    return this.accessPolicy.mutate({
      tenantId,
      actorPrincipalId: actorUserId,
      request
    });
  }

  async reset(
    actorUserId: string,
    tenantId: string,
    request: ResetPolicyDto
  ): Promise<PolicyMutationResultDto> {
    await this.assertActorCanManage(actorUserId, tenantId, request.target);
    return this.accessPolicy.reset({
      tenantId,
      actorPrincipalId: actorUserId,
      request
    });
  }

  async getMatrix(tenantId: string): Promise<PermissionMatrixDto> {
    const tenantRoles = TENANT_STUDIO_ROLES.filter(
      (role) => MANAGED_ROLE_BINDING_SCOPES[role] === "tenant"
    );
    const documents = await Promise.all(
      tenantRoles.map((role) => this.getRolePolicy(tenantId, role, "tenant", tenantId))
    );
    const effectiveByRole = new Map(
      documents.map((document, index) => [
        tenantRoles[index]!,
        new Map(document.items.map((item) => [item.permission, item.effective === "ALLOW"]))
      ])
    );
    return {
      policyVersion: POLICY_VERSION,
      roles: TENANT_STUDIO_ROLES,
      items: PERMISSIONS.map((permission) => {
        const meta = getPermissionMeta(permission);
        const rolePermissions = Object.fromEntries(
          TENANT_STUDIO_ROLES.map((role) => {
            const persisted = effectiveByRole.get(role)?.get(permission);
            return [
              role,
              persisted ??
                MANAGED_ROLE_POLICIES[role].some(
                  (statement) => statement.permission === permission && statement.effect === "allow"
                )
            ];
          })
        ) as Record<ManagedRole, boolean>;
        return {
          id: permission,
          label: meta.label,
          category: meta.category,
          actionType: meta.actionType,
          riskLevel: meta.riskLevel,
          description: meta.description,
          rolePermissions
        };
      })
    };
  }

  async updatePolicy(
    actorUserId: string,
    tenantId: string,
    dto: UpdatePermissionMatrixPolicyDto
  ): Promise<PermissionMatrixDto> {
    if (MANAGED_ROLE_POLICY_METADATA[dto.role].immutable) {
      this.forbidden(`${dto.role} policy is immutable`);
    }
    if (MANAGED_ROLE_BINDING_SCOPES[dto.role] !== "tenant") {
      this.validation("Compatibility writes require a resource-scoped v2 endpoint");
    }
    const document = await this.getRolePolicy(tenantId, dto.role, "tenant", tenantId);
    await this.mutate(actorUserId, tenantId, {
      expectedRevision: document.revision,
      idempotencyKey: `compat-${randomUUID()}`,
      reason: `Compatibility matrix update for ${dto.permission}`,
      atomic: true,
      mutations: [
        {
          permission: dto.permission,
          target: document.target,
          configured: dto.allowed ? "ALLOW" : "DENY"
        }
      ]
    });
    return this.getMatrix(tenantId);
  }

  async getMemberPermissions(tenantId: string, memberId: string): Promise<MemberPermissionsDto> {
    const member = await this.requireTenantMember(tenantId, memberId);
    const target: PolicyTargetDto = {
      type: "PRINCIPAL",
      principalId: member.userId,
      scope: "tenant",
      resourceId: tenantId
    };
    const document = await this.accessPolicy.document(tenantId, target);
    const role: ManagedRole = member.role === "OWNER" ? "TENANT_OWNER" : "TENANT_ADMIN";
    const byPermission = new Map(document.items.map((item) => [item.permission, item]));
    return {
      memberId: member.id,
      memberName: member.user.name,
      memberEmail: member.user.email,
      memberRole: role,
      customOverridesCount: document.items.filter(({ configured }) => configured !== "INHERIT")
        .length,
      items: PERMISSIONS.map((permission) => {
        const meta = getPermissionMeta(permission);
        const item = byPermission.get(permission);
        const inheritedRoleDefault = MANAGED_ROLE_POLICIES[role].some(
          (statement) => statement.permission === permission && statement.effect === "allow"
        );
        return {
          id: permission,
          label: meta.label,
          category: meta.category,
          parentGroup: meta.parentGroup,
          actionDimension: meta.actionDimension,
          riskLevel: meta.riskLevel,
          description: meta.description,
          allowed: item ? item.effective === "ALLOW" : inheritedRoleDefault,
          isCustomOverride: item ? item.configured !== "INHERIT" : false,
          inheritedRoleDefault
        };
      })
    };
  }

  async updateMemberPermission(
    actorUserId: string,
    tenantId: string,
    memberId: string,
    dto: UpdateMemberPermissionDto
  ): Promise<MemberPermissionsDto> {
    const member = await this.requireTenantMember(tenantId, memberId);
    const target: PolicyTargetDto = {
      type: "PRINCIPAL",
      principalId: member.userId,
      scope: "tenant",
      resourceId: tenantId
    };
    const document = await this.accessPolicy.document(tenantId, target);
    await this.mutate(actorUserId, tenantId, {
      expectedRevision: document.revision,
      idempotencyKey: `compat-${randomUUID()}`,
      reason: `Compatibility member update for ${dto.permission}`,
      atomic: true,
      mutations: [
        {
          permission: dto.permission,
          target,
          configured: dto.allowed ? "ALLOW" : "DENY"
        }
      ]
    });
    return this.getMemberPermissions(tenantId, memberId);
  }

  async restoreRoleDefaults(
    actorUserId: string,
    tenantId: string,
    memberId: string
  ): Promise<MemberPermissionsDto> {
    const member = await this.requireTenantMember(tenantId, memberId);
    const target: PolicyTargetDto = {
      type: "PRINCIPAL",
      principalId: member.userId,
      scope: "tenant",
      resourceId: tenantId
    };
    const document = await this.accessPolicy.document(tenantId, target);
    await this.reset(actorUserId, tenantId, {
      expectedRevision: document.revision,
      idempotencyKey: `compat-${randomUUID()}`,
      reason: "Compatibility restore role defaults",
      target
    });
    return this.getMemberPermissions(tenantId, memberId);
  }

  private async resolveDirectoryTarget(
    tenantId: string,
    query: PolicyDirectoryQueryDto
  ): Promise<{ scope: ResourceScope; resourceId: string }> {
    const scope = query.scope ?? "tenant";
    const resourceId = query.resourceId ?? (scope === "tenant" ? tenantId : undefined);
    if (!resourceId) {
      this.validation("resourceId query parameter is required when scope is not tenant");
    }
    const ancestryRole: ManagedRole =
      scope === "project"
        ? "PROJECT_MANAGER"
        : scope === "workspace"
          ? "WORKSPACE_ADMIN"
          : "TENANT_ADMIN";
    await this.accessPolicy.loadOverrides(tenantId, {
      type: "ROLE",
      role: ancestryRole,
      scope,
      resourceId
    });
    return { scope, resourceId };
  }

  private async assertActorCanManage(
    actorUserId: string,
    tenantId: string,
    target?: PolicyTargetDto
  ): Promise<void> {
    if (!target) this.validation("At least one target is required");
    const actor = await this.prisma.tenantMember.findUnique({
      where: { userId: actorUserId }
    });
    if (!actor?.isActive || actor.tenantId !== tenantId) {
      this.forbidden("Active organization administrator required");
    }
    if (target.type === "ROLE" && MANAGED_ROLE_POLICY_METADATA[target.role].immutable) {
      this.forbidden(`${target.role} policy is immutable`);
    }
    if (actor.role === "ADMIN") {
      if (
        target.scope === "tenant" ||
        (target.type === "ROLE" &&
          !["WORKSPACE_ADMIN", "WORKSPACE_MEMBER", "PROJECT_MANAGER"].includes(target.role))
      ) {
        this.forbidden("Organization administrators may only delegate lower resource roles");
      }
      if (target.type === "PRINCIPAL") {
        const principal = await this.prisma.tenantMember.findUnique({
          where: { userId: target.principalId }
        });
        if (principal?.role === "OWNER" || principal?.role === "ADMIN") {
          this.forbidden("Organization administrators cannot change peer or owner policy");
        }
      }
    }
  }

  private async requireTenantMember(tenantId: string, memberId: string) {
    const member = await this.prisma.tenantMember.findUnique({
      where: { id: memberId },
      include: { user: true }
    });
    if (!member || member.tenantId !== tenantId) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Organization member not found",
        HttpStatus.NOT_FOUND
      );
    }
    return member;
  }

  private roleDisplayName(role: ManagedRole): string {
    return role
      .toLowerCase()
      .split("_")
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(" ");
  }

  private validation(message: string): never {
    throw new DomainException(ErrorCodes.VALIDATION_ERROR, message, HttpStatus.BAD_REQUEST);
  }

  private forbidden(message: string): never {
    throw new DomainException(ErrorCodes.FORBIDDEN, message, HttpStatus.FORBIDDEN);
  }
}
