import {
  ErrorCodes,
  getPermissionMeta,
  MANAGED_ROLE_BINDING_SCOPES,
  MANAGED_ROLE_POLICY_METADATA,
  MANAGED_ROLE_POLICIES,
  PERMISSIONS,
  POLICY_CHECKSUM,
  POLICY_VERSION,
  type BatchPolicyMutationDto,
  type CapabilitySnapshot,
  type EffectivePermissionItemDto,
  type ManagedRole,
  type Permission,
  type PermissionPolicyDocumentDto,
  type PolicyMutationResultDto,
  type PolicyTargetDto,
  type ResetPolicyDto,
  type ResourceScope
} from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { DomainException } from "../errors/domain.exception";
import {
  permissionAuditEventHash,
  deterministicSha256,
  type PermissionAuditHashFacts
} from "./access-policy-hash";
import { AccessPolicyRepository, type AccessPolicyTransaction } from "./access-policy.repository";

type StoredEffect = "allow" | "deny";

export interface AccessPolicyMutationCommand {
  tenantId: string;
  actorPrincipalId: string;
  request: BatchPolicyMutationDto;
}

export interface AccessPolicyResetCommand {
  tenantId: string;
  actorPrincipalId: string;
  request: ResetPolicyDto;
}

export interface CapabilitySnapshotBinding {
  role: ManagedRole;
  scope: ResourceScope;
  resourceId: string;
}

export interface AuditChainVerification {
  valid: boolean;
  checked: number;
  invalidEventId?: string;
  expectedHash?: string;
  actualHash?: string;
}

@Injectable()
export class AccessPolicyService {
  constructor(private readonly repository: AccessPolicyRepository) {}

  async loadOverrides(tenantId: string, target: PolicyTargetDto) {
    const prisma = this.repository.client();
    await this.assertTargetTenant(prisma as never, tenantId, target);
    return this.repository.loadTargetOverrides(prisma, tenantId, target);
  }

  async document(tenantId: string, target: PolicyTargetDto): Promise<PermissionPolicyDocumentDto> {
    const prisma = this.repository.client();
    await this.assertTargetTenant(prisma as never, tenantId, target);
    const state = await this.repository.ensureState(prisma as never, tenantId);
    const roles = await this.resolveRoles(prisma as never, tenantId, target);
    const permissions = this.applicablePermissions(target, roles);
    const [rows, roleRows] = await Promise.all([
      this.repository.loadTargetOverrides(prisma, tenantId, target, permissions),
      target.type === "PRINCIPAL" && roles.length
        ? prisma.tenantRolePermissionOverride.findMany({
            where: {
              tenantId,
              role: { in: roles },
              scope: target.scope,
              resourceId: target.resourceId,
              permission: { in: permissions }
            }
          })
        : Promise.resolve([])
    ]);
    const configured = new Map(
      rows.map((row) => [row.permission as Permission, row.effect as StoredEffect])
    );
    return {
      policyVersion: state.policyVersion,
      policyChecksum: state.policyChecksum,
      revision: state.revision,
      target,
      items: permissions.map((permission) =>
        this.item(target, permission, configured.get(permission), roles, roleRows)
      )
    };
  }

  async reset(command: AccessPolicyResetCommand): Promise<PolicyMutationResultDto> {
    const { tenantId, actorPrincipalId, request } = command;
    const document = await this.document(tenantId, request.target);
    const overridden = document.items.filter(({ configured }) => configured !== "INHERIT");
    const resetItems = overridden.length > 0 ? overridden : document.items.slice(0, 1);
    if (resetItems.length === 0) {
      this.validation("The target has no applicable customizable permissions");
    }
    const result = await this.mutate({
      tenantId,
      actorPrincipalId,
      request: {
        expectedRevision: request.expectedRevision,
        idempotencyKey: request.idempotencyKey,
        reason: request.reason,
        atomic: true,
        mutations: resetItems.map(({ permission }) => ({
          permission,
          target: request.target,
          configured: "INHERIT" as const
        }))
      }
    });
    const resetDocument = await this.document(tenantId, request.target);
    return { ...result, items: resetDocument.items };
  }

  async capabilitySnapshot(input: {
    tenantId: string;
    principalId: string;
    bindings: readonly CapabilitySnapshotBinding[];
    membershipRevision?: number;
  }): Promise<CapabilitySnapshot> {
    const client = this.repository.client();
    const targets = input.bindings.map(({ role, scope, resourceId }) => ({
      role,
      scope,
      resourceId
    }));
    const principalTargets = [
      ...new Map(
        [
          ...input.bindings.map(({ scope, resourceId }) => ({ scope, resourceId })),
          { scope: "self" as const, resourceId: input.principalId }
        ].map((target) => [`${target.scope}:${target.resourceId}`, target])
      ).values()
    ];
    const [state, roleRows, principalRows] = await Promise.all([
      this.repository.ensureState(client as never, input.tenantId),
      targets.length
        ? client.tenantRolePermissionOverride.findMany({
            where: { tenantId: input.tenantId, OR: targets }
          })
        : Promise.resolve([]),
      client.principalPermissionOverride.findMany({
        where: {
          tenantId: input.tenantId,
          principalId: input.principalId,
          OR: principalTargets
        }
      })
    ]);
    const candidates = new Map<
      string,
      { permission: Permission; scope: ResourceScope; resourceId: string; roles: ManagedRole[] }
    >();
    for (const binding of input.bindings) {
      for (const statement of MANAGED_ROLE_POLICIES[binding.role]) {
        if (statement.effect !== "allow") continue;
        const scope = statement.scope;
        const resourceId = scope === "self" ? input.principalId : binding.resourceId;
        const key = `${statement.permission}|${scope}|${resourceId}`;
        const candidate = candidates.get(key) ?? {
          permission: statement.permission,
          scope,
          resourceId,
          roles: []
        };
        candidate.roles.push(binding.role);
        candidates.set(key, candidate);
      }
    }
    for (const row of principalRows) {
      const permission = row.permission as Permission;
      if (!PERMISSIONS.includes(permission)) continue;
      const key = `${permission}|${row.scope}|${row.resourceId}`;
      if (!candidates.has(key)) {
        candidates.set(key, {
          permission,
          scope: row.scope as ResourceScope,
          resourceId: row.resourceId,
          roles: []
        });
      }
    }
    const capabilities = [...candidates.values()].map((candidate) => {
      const principal = principalRows.find(
        (row) =>
          row.permission === candidate.permission &&
          row.scope === candidate.scope &&
          row.resourceId === candidate.resourceId
      );
      if (principal) {
        return {
          permission: candidate.permission,
          scope: candidate.scope,
          resourceId: candidate.resourceId,
          allowed: principal.effect === "allow",
          source: "principal-policy" as const
        };
      }
      for (const role of candidate.roles) {
        const binding = input.bindings.find((item) => item.role === role);
        if (!binding) continue;
        const override = roleRows.find(
          (row) =>
            row.role === role &&
            row.permission === candidate.permission &&
            row.scope === binding.scope &&
            row.resourceId === binding.resourceId
        );
        if (override?.effect === "allow") {
          return {
            permission: candidate.permission,
            scope: candidate.scope,
            resourceId: candidate.resourceId,
            allowed: true,
            source: "role-policy" as const,
            sourceRole: role
          };
        }
        if (!override || override.effect !== "deny") {
          return {
            permission: candidate.permission,
            scope: candidate.scope,
            resourceId: candidate.resourceId,
            allowed: true,
            source: "canonical-role" as const,
            sourceRole: role
          };
        }
      }
      return {
        permission: candidate.permission,
        scope: candidate.scope,
        resourceId: candidate.resourceId,
        allowed: false,
        source: "role-policy" as const,
        ...(candidate.roles[0] ? { sourceRole: candidate.roles[0] } : {})
      };
    });
    const computedAt = new Date();
    const expiresAt = new Date(computedAt.getTime() + 5 * 60_000);
    const membershipRevision = input.membershipRevision ?? 0;
    const etag = `"${deterministicSha256({
      policyVersion: POLICY_VERSION,
      policyChecksum: POLICY_CHECKSUM,
      policyRevision: state.revision,
      membershipRevision,
      principalId: input.principalId,
      tenantId: input.tenantId,
      capabilities
    })}"`;
    return {
      policyVersion: POLICY_VERSION,
      policyChecksum: POLICY_CHECKSUM,
      policyRevision: state.revision,
      membershipRevision,
      principalId: input.principalId,
      tenantId: input.tenantId,
      computedAt: computedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      etag,
      capabilities
    };
  }

  async mutate(command: AccessPolicyMutationCommand): Promise<PolicyMutationResultDto> {
    const { tenantId, actorPrincipalId, request } = command;
    const target = this.assertSingleTarget(request);
    const requestHash = deterministicSha256({ actorPrincipalId, request });

    return this.repository.transaction(async (tx) => {
      const replay = await tx.permissionPolicyIdempotencyRecord.findUnique({
        where: {
          tenantId_idempotencyKey: { tenantId, idempotencyKey: request.idempotencyKey }
        }
      });
      if (replay) {
        if (replay.requestHash !== requestHash) {
          this.conflict("Idempotency key was already used for a different request");
        }
        return replay.response as unknown as PolicyMutationResultDto;
      }

      await this.assertTargetTenant(tx, tenantId, target);
      const state = await this.repository.ensureState(tx, tenantId);
      if (state.policyVersion !== POLICY_VERSION || state.policyChecksum !== POLICY_CHECKSUM) {
        this.conflict("Persisted policy snapshot does not match the running policy");
      }
      if (state.revision !== request.expectedRevision) {
        this.revisionConflict(request.expectedRevision, state.revision);
      }

      const claimed = await tx.tenantPermissionPolicyState.updateMany({
        where: { tenantId, revision: request.expectedRevision },
        data: { revision: { increment: 1 } }
      });
      if (claimed.count !== 1) {
        const latest = await tx.tenantPermissionPolicyState.findUniqueOrThrow({
          where: { tenantId }
        });
        this.revisionConflict(request.expectedRevision, latest.revision);
      }

      const permissions = request.mutations.map(({ permission }) => permission);
      const beforeRows = await this.repository.loadTargetOverrides(
        tx,
        tenantId,
        target,
        permissions
      );
      const before = new Map(beforeRows.map((row) => [row.permission, row.effect as StoredEffect]));
      const roles = await this.resolveRoles(tx, tenantId, target);
      const roleRows =
        target.type === "PRINCIPAL" && roles.length
          ? await tx.tenantRolePermissionOverride.findMany({
              where: {
                tenantId,
                role: { in: roles },
                scope: target.scope,
                resourceId: target.resourceId,
                permission: { in: permissions }
              }
            })
          : [];

      const after = new Map(before);
      let previousHash = state.lastAuditHash;
      const auditRows: Array<PermissionAuditHashFacts & { eventHash: string }> = [];

      for (const [eventIndex, mutation] of request.mutations.entries()) {
        const configured = mutation.configured;
        const nextEffect: StoredEffect | undefined =
          configured === "INHERIT" ? undefined : (configured.toLowerCase() as StoredEffect);
        const previousEffect = after.get(mutation.permission);
        const effectiveBefore = this.effective(
          target,
          mutation.permission,
          previousEffect,
          roles,
          roleRows
        );

        await this.writeOverride(tx, tenantId, target, mutation.permission, nextEffect);
        if (nextEffect) after.set(mutation.permission, nextEffect);
        else after.delete(mutation.permission);

        const effectiveAfter = this.effective(
          target,
          mutation.permission,
          nextEffect,
          roles,
          roleRows
        );
        const facts: PermissionAuditHashFacts = {
          tenantId,
          revision: state.revision + 1,
          eventIndex,
          actorPrincipalId,
          targetType: target.type,
          targetId: target.type === "ROLE" ? `role:${target.role}` : target.principalId,
          role: target.type === "ROLE" ? target.role : null,
          scope: target.scope,
          resourceId: target.resourceId,
          permission: mutation.permission,
          beforeEffect: previousEffect ?? null,
          afterEffect: nextEffect ?? null,
          effectiveBefore,
          effectiveAfter,
          reason: request.reason,
          idempotencyKey: request.idempotencyKey,
          previousHash
        };
        const eventHash = permissionAuditEventHash(facts);
        auditRows.push({ ...facts, eventHash });
        previousHash = eventHash;
      }

      await tx.permissionPolicyAuditEvent.createMany({
        data: auditRows
      });
      await tx.tenantPermissionPolicyState.update({
        where: { tenantId },
        data: { lastAuditHash: previousHash }
      });

      const result: PolicyMutationResultDto = {
        policyVersion: POLICY_VERSION,
        previousRevision: state.revision,
        revision: state.revision + 1,
        target,
        items: request.mutations.map(({ permission }) =>
          this.item(target, permission, after.get(permission), roles, roleRows)
        )
      };
      await tx.permissionPolicyIdempotencyRecord.create({
        data: {
          tenantId,
          idempotencyKey: request.idempotencyKey,
          requestHash,
          response: result as unknown as Prisma.InputJsonValue,
          revision: result.revision
        }
      });
      return result;
    });
  }

  async verifyAuditChain(tenantId: string): Promise<AuditChainVerification> {
    const client = this.repository.client();
    const [events, state] = await Promise.all([
      client.permissionPolicyAuditEvent.findMany({
        where: { tenantId },
        orderBy: [{ revision: "asc" }, { eventIndex: "asc" }]
      }),
      client.tenantPermissionPolicyState.findUnique({ where: { tenantId } })
    ]);
    let previousHash: string | null = null;
    for (const [index, event] of events.entries()) {
      const facts: PermissionAuditHashFacts = {
        tenantId: event.tenantId,
        revision: event.revision,
        eventIndex: event.eventIndex,
        actorPrincipalId: event.actorPrincipalId,
        targetType: event.targetType as "ROLE" | "PRINCIPAL",
        targetId: event.targetId,
        role: event.role,
        scope: event.scope,
        resourceId: event.resourceId,
        permission: event.permission,
        beforeEffect: event.beforeEffect,
        afterEffect: event.afterEffect,
        effectiveBefore: event.effectiveBefore,
        effectiveAfter: event.effectiveAfter,
        reason: event.reason,
        idempotencyKey: event.idempotencyKey,
        previousHash
      };
      const expectedHash = permissionAuditEventHash(facts);
      if (event.previousHash !== previousHash || event.eventHash !== expectedHash) {
        return {
          valid: false,
          checked: index,
          invalidEventId: event.id,
          expectedHash,
          actualHash: event.eventHash
        };
      }
      previousHash = event.eventHash;
    }
    if ((state?.lastAuditHash ?? null) !== previousHash) {
      return {
        valid: false,
        checked: events.length,
        expectedHash: state?.lastAuditHash ?? undefined,
        actualHash: previousHash ?? undefined
      };
    }
    return { valid: true, checked: events.length };
  }

  private assertSingleTarget(request: BatchPolicyMutationDto): PolicyTargetDto {
    const target = request.mutations[0]?.target;
    if (!target) this.validation("At least one policy mutation is required");
    const targetKey = deterministicSha256(target);
    const seen = new Set<string>();
    for (const mutation of request.mutations) {
      if (deterministicSha256(mutation.target) !== targetKey) {
        this.validation("Atomic policy batches must address exactly one target");
      }
      if (seen.has(mutation.permission)) {
        this.validation("Atomic policy batches cannot repeat a permission");
      }
      const meta = getPermissionMeta(mutation.permission);
      const compatibleScope =
        target.scope === meta.resourceScope ||
        (meta.resourceFamily === "project" && target.scope === "workspace");
      if (!compatibleScope || !meta.customizable) {
        this.validation(`${mutation.permission} is not customizable at ${target.scope} scope`);
      }
      seen.add(mutation.permission);
    }
    if (
      target.type === "ROLE" &&
      (MANAGED_ROLE_BINDING_SCOPES[target.role] !== target.scope ||
        !MANAGED_ROLE_POLICY_METADATA[target.role].customizationEnabled)
    ) {
      this.validation(`${target.role} is not customizable at ${target.scope} scope`);
    }
    return target;
  }

  private async assertTargetTenant(
    tx: AccessPolicyTransaction,
    tenantId: string,
    target: PolicyTargetDto
  ): Promise<void> {
    let ownerTenantId: string | undefined;
    switch (target.scope) {
      case "tenant":
        ownerTenantId = target.resourceId;
        break;
      case "workspace":
        ownerTenantId = (
          await tx.workspace.findUnique({
            where: { id: target.resourceId },
            select: { tenantId: true }
          })
        )?.tenantId;
        break;
      case "project":
        ownerTenantId = (
          await tx.project.findUnique({
            where: { id: target.resourceId },
            select: { workspace: { select: { tenantId: true } } }
          })
        )?.workspace.tenantId;
        break;
      case "self":
        ownerTenantId = (
          await tx.tenantMember.findUnique({
            where: {
              userId: target.type === "PRINCIPAL" ? target.principalId : target.resourceId
            },
            select: { tenantId: true }
          })
        )?.tenantId;
        break;
      case "platform":
        this.validation("Platform policy is not tenant customizable");
    }
    if (!ownerTenantId || ownerTenantId !== tenantId) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Policy target was not found in this organization",
        HttpStatus.NOT_FOUND
      );
    }
    if (target.type === "PRINCIPAL") {
      const member = await tx.tenantMember.findUnique({
        where: { userId: target.principalId },
        select: { tenantId: true }
      });
      if (!member || member.tenantId !== tenantId) {
        throw new DomainException(
          ErrorCodes.NOT_FOUND,
          "Policy principal was not found in this organization",
          HttpStatus.NOT_FOUND
        );
      }
    }
  }

  private async resolveRoles(
    tx: AccessPolicyTransaction,
    tenantId: string,
    target: PolicyTargetDto
  ): Promise<ManagedRole[]> {
    if (target.type === "ROLE") return [target.role];
    const roles: ManagedRole[] = [];
    const tenantMember = await tx.tenantMember.findUnique({
      where: { userId: target.principalId }
    });
    if (tenantMember?.tenantId === tenantId) {
      roles.push(tenantMember.role === "OWNER" ? "TENANT_OWNER" : "TENANT_ADMIN");
    }
    if (target.scope === "workspace") {
      const member = await tx.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: target.resourceId,
            userId: target.principalId
          }
        }
      });
      if (member?.isActive) {
        roles.push(member.role === "ADMIN" ? "WORKSPACE_ADMIN" : "WORKSPACE_MEMBER");
      }
    }
    if (target.scope === "project") {
      const teamMember = await tx.teamMember.findFirst({
        where: {
          userId: target.principalId,
          isActive: true,
          team: { projectId: target.resourceId }
        }
      });
      if (teamMember?.role === "PROJECT_MANAGER") roles.push("PROJECT_MANAGER");
    }
    return [...new Set(roles)];
  }

  private async writeOverride(
    tx: AccessPolicyTransaction,
    tenantId: string,
    target: PolicyTargetDto,
    permission: Permission,
    effect?: StoredEffect
  ): Promise<void> {
    if (target.type === "ROLE") {
      const where = {
        tenantId_role_scope_resourceId_permission: {
          tenantId,
          role: target.role,
          scope: target.scope,
          resourceId: target.resourceId,
          permission
        }
      };
      if (!effect) {
        await tx.tenantRolePermissionOverride.deleteMany({
          where: where.tenantId_role_scope_resourceId_permission
        });
        return;
      }
      await tx.tenantRolePermissionOverride.upsert({
        where,
        create: { ...where.tenantId_role_scope_resourceId_permission, effect },
        update: { effect }
      });
      return;
    }
    const key = {
      tenantId,
      principalId: target.principalId,
      scope: target.scope,
      resourceId: target.resourceId,
      permission
    };
    if (!effect) {
      await tx.principalPermissionOverride.deleteMany({ where: key });
      return;
    }
    await tx.principalPermissionOverride.upsert({
      where: { tenantId_principalId_scope_resourceId_permission: key },
      create: { ...key, effect },
      update: { effect }
    });
  }

  private effective(
    target: PolicyTargetDto,
    permission: Permission,
    configured: StoredEffect | undefined,
    roles: readonly ManagedRole[],
    roleRows: readonly { role: string; permission: string; effect: string }[]
  ): StoredEffect {
    if (configured) return configured;
    for (const role of roles) {
      const roleOverride = roleRows.find(
        (row) => row.role === role && row.permission === permission
      )?.effect as StoredEffect | undefined;
      if (roleOverride === "allow") return "allow";
      if (
        roleOverride !== "deny" &&
        MANAGED_ROLE_POLICIES[role].some(
          (statement) =>
            statement.permission === permission &&
            statement.effect === "allow" &&
            this.scopeApplies(statement.scope, target.scope)
        )
      ) {
        return "allow";
      }
    }
    return "deny";
  }

  private item(
    target: PolicyTargetDto,
    permission: Permission,
    configured: StoredEffect | undefined,
    roles: readonly ManagedRole[],
    roleRows: readonly { role: string; permission: string; effect: string }[]
  ): EffectivePermissionItemDto {
    const effective = this.effective(target, permission, configured, roles, roleRows);
    const roleOverride = roles
      .map((role) => ({
        role,
        effect: roleRows.find((row) => row.role === role && row.permission === permission)
          ?.effect as StoredEffect | undefined
      }))
      .find(({ effect }) => effect === "allow");
    const canonicalRole = roles.find((role) =>
      MANAGED_ROLE_POLICIES[role].some(
        (statement) =>
          statement.permission === permission &&
          statement.effect === "allow" &&
          this.scopeApplies(statement.scope, target.scope)
      )
    );
    return {
      permission,
      target,
      configured: configured ? (configured.toUpperCase() as "ALLOW" | "DENY") : "INHERIT",
      effective: effective.toUpperCase() as "ALLOW" | "DENY",
      source:
        target.type === "PRINCIPAL" && configured
          ? configured === "deny"
            ? "PRINCIPAL_DENY"
            : "PRINCIPAL_ALLOW"
          : configured
            ? "ROLE_POLICY"
            : roleOverride
              ? "ROLE_POLICY"
              : effective === "allow"
                ? "CANONICAL_ROLE"
                : "DEFAULT_DENY",
      ...(roleOverride?.role || canonicalRole
        ? { sourceRole: roleOverride?.role ?? canonicalRole }
        : {}),
      reason: configured
        ? `Explicit ${target.type.toLowerCase()} policy ${configured}`
        : roleOverride
          ? `Allowed by ${roleOverride.role} policy override`
          : canonicalRole
            ? `Inherited from ${canonicalRole}`
            : "No applicable role grants this permission"
    };
  }

  private applicablePermissions(
    target: PolicyTargetDto,
    roles: readonly ManagedRole[]
  ): Permission[] {
    return PERMISSIONS.filter((permission) => {
      const meta = getPermissionMeta(permission);
      const compatibleScope =
        meta.resourceScope === target.scope ||
        (meta.resourceFamily === "project" && target.scope === "workspace");
      return (
        compatibleScope &&
        meta.customizable &&
        roles.some((role) => meta.applicableTargetRoles.includes(role))
      );
    });
  }

  private scopeApplies(statement: ResourceScope, target: ResourceScope): boolean {
    return statement === target || (statement === "workspace" && target === "project");
  }

  private revisionConflict(expectedRevision: number, actualRevision: number): never {
    throw new DomainException(
      ErrorCodes.CONFLICT,
      "Permission policy revision conflict",
      HttpStatus.CONFLICT,
      {
        code: "POLICY_CONFLICT",
        expectedRevision,
        actualRevision,
        conflicts: [
          {
            field: "revision",
            expected: expectedRevision,
            actual: actualRevision,
            message: "The policy changed after it was loaded"
          }
        ]
      }
    );
  }

  private conflict(message: string): never {
    throw new DomainException(ErrorCodes.CONFLICT, message, HttpStatus.CONFLICT);
  }

  private validation(message: string): never {
    throw new DomainException(ErrorCodes.VALIDATION_ERROR, message, HttpStatus.BAD_REQUEST);
  }
}
