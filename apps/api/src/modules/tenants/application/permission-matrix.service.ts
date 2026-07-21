import {
  ErrorCodes,
  getPermissionMeta,
  MANAGED_ROLE_POLICIES,
  PERMISSIONS,
  POLICY_VERSION,
  type ManagedRole,
  type MemberPermissionItemDto,
  type MemberPermissionsDto,
  type Permission,
  type PermissionMatrixDto,
  type PermissionMatrixItemDto,
  type PolicyStatement,
  type UpdateMemberPermissionDto,
  type UpdatePermissionMatrixPolicyDto
} from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { RoleGrantAuditService } from "../../../common/access/role-grant-audit.service";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { requireTenantOwnerOrAdmin } from "../../../common/tenant/tenant-context";

// In-memory tenant role & per-member policy overrides store
const tenantRolePolicyOverrides = new Map<string, Map<string, boolean>>();
const memberPolicyOverrides = new Map<string, Map<string, boolean>>();

@Injectable()
export class PermissionMatrixService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleGrantAudit: RoleGrantAuditService
  ) {}

  async getMatrix(tenantId: string): Promise<PermissionMatrixDto> {
    const roles: ManagedRole[] = [
      "TENANT_OWNER",
      "TENANT_ADMIN",
      "WORKSPACE_ADMIN",
      "WORKSPACE_MEMBER",
      "PROJECT_MANAGER"
    ];

    const overrides = tenantRolePolicyOverrides.get(tenantId) ?? new Map<string, boolean>();

    const items: PermissionMatrixItemDto[] = PERMISSIONS.map((permissionId) => {
      const meta = getPermissionMeta(permissionId as Permission);

      const rolePermissions: Record<string, boolean> = {};

      for (const role of roles) {
        const overrideKey = `${role}:${permissionId}`;
        if (overrides.has(overrideKey)) {
          rolePermissions[role] = overrides.get(overrideKey)!;
        } else {
          const statements = (MANAGED_ROLE_POLICIES[role] ?? []) as readonly PolicyStatement[];
          rolePermissions[role] = statements.some(
            (s) => s.effect === "allow" && s.permission === permissionId
          );
        }
      }

      return {
        id: meta.id,
        label: meta.label,
        category: meta.category,
        actionType: meta.actionType,
        riskLevel: meta.riskLevel,
        description: meta.description,
        rolePermissions
      };
    });

    return {
      policyVersion: POLICY_VERSION,
      roles,
      items
    };
  }

  async updatePolicy(
    actorUserId: string,
    tenantId: string,
    dto: UpdatePermissionMatrixPolicyDto
  ): Promise<PermissionMatrixDto> {
    const member = await requireTenantOwnerOrAdmin(this.prisma, actorUserId, tenantId);
    const isOwner = member.role === "OWNER";

    if (dto.role === "TENANT_OWNER" && !isOwner) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Only organization owners can modify Tenant Owner policy statements",
        HttpStatus.FORBIDDEN
      );
    }

    if (
      (dto.permission === "tenant:ManageBilling" || dto.permission === "tenant:ExportData") &&
      !isOwner
    ) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Only organization owners can modify billing and export permissions",
        HttpStatus.FORBIDDEN
      );
    }

    await this.prisma.$transaction(async (tx) => {
      let overrides = tenantRolePolicyOverrides.get(tenantId);
      if (!overrides) {
        overrides = new Map<string, boolean>();
        tenantRolePolicyOverrides.set(tenantId, overrides);
      }
      const overrideKey = `${dto.role}:${dto.permission}`;
      overrides.set(overrideKey, dto.allowed);

      const scope = dto.permission.split(":")[0] as any;

      await this.roleGrantAudit.record(tx, {
        actorUserId,
        targetUserId: `role:${dto.role}`,
        role: dto.role,
        scope:
          scope === "tenant" || scope === "workspace" || scope === "project" ? scope : "tenant",
        resourceId: tenantId,
        reason: `permission_matrix_toggle:${dto.permission}`,
        outcome: dto.allowed ? "GRANTED" : "REVOKED",
        tenantId,
        policyVersion: POLICY_VERSION,
        decisionReason: "managed_role_override",
        actorType: "user",
        requestSource: "api"
      });
    });

    return this.getMatrix(tenantId);
  }

  async getMemberPermissions(tenantId: string, memberId: string): Promise<MemberPermissionsDto> {
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

    const memberRole: ManagedRole = member.role === "OWNER" ? "TENANT_OWNER" : "TENANT_ADMIN";
    const memberOverrides = memberPolicyOverrides.get(memberId) ?? new Map<string, boolean>();
    const roleStatements = (MANAGED_ROLE_POLICIES[memberRole] ?? []) as readonly PolicyStatement[];

    const items: MemberPermissionItemDto[] = PERMISSIONS.map((permissionId) => {
      const meta = getPermissionMeta(permissionId as Permission);
      const inheritedRoleDefault = roleStatements.some(
        (s) => s.effect === "allow" && s.permission === permissionId
      );
      const isCustomOverride = memberOverrides.has(permissionId);
      const allowed = isCustomOverride ? memberOverrides.get(permissionId)! : inheritedRoleDefault;

      return {
        id: meta.id,
        label: meta.label,
        category: meta.category,
        parentGroup: meta.parentGroup,
        actionDimension: meta.actionDimension,
        riskLevel: meta.riskLevel,
        description: meta.description,
        allowed,
        isCustomOverride,
        inheritedRoleDefault
      };
    });

    return {
      memberId: member.id,
      memberName: member.user.name,
      memberEmail: member.user.email,
      memberRole,
      customOverridesCount: memberOverrides.size,
      items
    };
  }

  async updateMemberPermission(
    actorUserId: string,
    tenantId: string,
    memberId: string,
    dto: UpdateMemberPermissionDto
  ): Promise<MemberPermissionsDto> {
    const actor = await requireTenantOwnerOrAdmin(this.prisma, actorUserId, tenantId);
    const targetMember = await this.prisma.tenantMember.findUnique({ where: { id: memberId } });

    if (!targetMember || targetMember.tenantId !== tenantId) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Organization member not found",
        HttpStatus.NOT_FOUND
      );
    }

    if (targetMember.role === "OWNER" && actor.role !== "OWNER") {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Only organization owners can customize permissions for an Owner",
        HttpStatus.FORBIDDEN
      );
    }

    await this.prisma.$transaction(async (tx) => {
      let overrides = memberPolicyOverrides.get(memberId);
      if (!overrides) {
        overrides = new Map<string, boolean>();
        memberPolicyOverrides.set(memberId, overrides);
      }
      overrides.set(dto.permission, dto.allowed);

      await this.roleGrantAudit.record(tx, {
        actorUserId,
        targetUserId: targetMember.userId,
        role: targetMember.role === "OWNER" ? "TENANT_OWNER" : "TENANT_ADMIN",
        scope: "tenant",
        resourceId: tenantId,
        reason: `member_permission_toggle:${dto.permission}`,
        outcome: dto.allowed ? "GRANTED" : "REVOKED",
        tenantId,
        policyVersion: POLICY_VERSION,
        decisionReason: "member_custom_override",
        actorType: "user",
        requestSource: "api"
      });
    });

    return this.getMemberPermissions(tenantId, memberId);
  }

  async restoreRoleDefaults(
    actorUserId: string,
    tenantId: string,
    memberId: string
  ): Promise<MemberPermissionsDto> {
    const actor = await requireTenantOwnerOrAdmin(this.prisma, actorUserId, tenantId);
    const targetMember = await this.prisma.tenantMember.findUnique({ where: { id: memberId } });

    if (!targetMember || targetMember.tenantId !== tenantId) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Organization member not found",
        HttpStatus.NOT_FOUND
      );
    }

    if (targetMember.role === "OWNER" && actor.role !== "OWNER") {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Only organization owners can reset permissions for an Owner",
        HttpStatus.FORBIDDEN
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const overrides = memberPolicyOverrides.get(memberId);
      if (overrides) {
        overrides.clear();
      }

      await this.roleGrantAudit.record(tx, {
        actorUserId,
        targetUserId: targetMember.userId,
        role: targetMember.role === "OWNER" ? "TENANT_OWNER" : "TENANT_ADMIN",
        scope: "tenant",
        resourceId: tenantId,
        reason: "restore_role_defaults",
        outcome: "GRANTED",
        tenantId,
        policyVersion: POLICY_VERSION,
        decisionReason: "restored_canonical_defaults",
        actorType: "user",
        requestSource: "api"
      });
    });

    return this.getMemberPermissions(tenantId, memberId);
  }
}
