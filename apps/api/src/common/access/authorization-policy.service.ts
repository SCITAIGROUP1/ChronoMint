import {
  ErrorCodes,
  getPermissionMeta,
  MANAGED_ROLE_BINDING_SCOPES,
  MANAGED_ROLE_POLICIES,
  POLICY_CHECKSUM,
  POLICY_VERSION,
  type ManagedRole,
  type Permission,
  type PolicyStatement,
  type ResourceScope
} from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainException } from "../errors/domain.exception";

export interface ManagedRoleBinding {
  role: ManagedRole;
  resourceId: string;
  /** Optional defensive assertion supplied by persistence adapters. */
  bindingScope?: ResourceScope;
  active?: boolean;
}

export interface AuthorizationResource {
  scope: ResourceScope;
  id: string;
  tenantId?: string;
  workspaceId?: string;
  projectId?: string;
  ownerUserId?: string;
}

export interface AuthorizationContext {
  tenantIsolationPassed: boolean;
  accountActive: boolean;
  subscriptionAllows: boolean;
}

export interface AuthorizationPolicyState {
  policyVersion: string;
  policyChecksum: string;
  revision: number;
}

export interface RolePermissionOverride {
  role: ManagedRole;
  permission: Permission;
  effect: "allow" | "deny";
  scope: ResourceScope;
  resourceId: string;
}

export interface PrincipalPermissionOverride {
  principalId: string;
  permission: Permission;
  effect: "allow" | "deny";
  scope: ResourceScope;
  resourceId: string;
}

export interface AuthorizationRequest {
  principalId: string;
  permission: Permission;
  resource: AuthorizationResource;
  bindings: readonly ManagedRoleBinding[];
  context: AuthorizationContext;
  policyState?: AuthorizationPolicyState;
  roleOverrides?: readonly RolePermissionOverride[];
  principalOverrides?: readonly PrincipalPermissionOverride[];
}

export type AuthorizationDecisionSource =
  | "SYSTEM_DENY"
  | "PRINCIPAL_DENY"
  | "PRINCIPAL_ALLOW"
  | "ROLE_POLICY"
  | "CANONICAL_ROLE"
  | "DEFAULT_DENY";

export type AuthorizationDecisionReason =
  | "malformed_context"
  | "policy_state_missing"
  | "policy_state_invalid"
  | "tenant_isolation"
  | "account_inactive"
  | "subscription_blocked"
  | "principal_deny"
  | "principal_allow"
  | "role_override"
  | "managed_role"
  | "default_deny";

export interface AuthorizationDecision {
  allowed: boolean;
  reason: AuthorizationDecisionReason;
  source: AuthorizationDecisionSource;
  sourceRole?: ManagedRole;
  /** Compatibility alias for callers that enforce a role-specific delegation boundary. */
  role?: ManagedRole;
  policyVersion: string;
  policyRevision: number | null;
  /** Present when reason is subscription_blocked. */
  subscriptionStatus?: string;
}

@Injectable()
export class AuthorizationPolicyService {
  evaluate(request: AuthorizationRequest): AuthorizationDecision {
    const decisionFacts = {
      policyVersion: request.policyState?.policyVersion ?? POLICY_VERSION,
      policyRevision: request.policyState?.revision ?? null
    };
    if (this.detectMalformedContext(request)) {
      return this.deny("malformed_context", "SYSTEM_DENY", decisionFacts);
    }
    if (!request.policyState) {
      return this.deny("policy_state_missing", "SYSTEM_DENY", decisionFacts);
    }
    if (
      request.policyState.policyVersion !== POLICY_VERSION ||
      request.policyState.policyChecksum !== POLICY_CHECKSUM ||
      !Number.isSafeInteger(request.policyState.revision) ||
      request.policyState.revision < 0
    ) {
      return this.deny("policy_state_invalid", "SYSTEM_DENY", decisionFacts);
    }

    if (!request.context.tenantIsolationPassed) {
      return this.deny("tenant_isolation", "SYSTEM_DENY", decisionFacts);
    }
    if (!request.context.accountActive) {
      return this.deny("account_inactive", "SYSTEM_DENY", decisionFacts);
    }
    if (!request.context.subscriptionAllows) {
      return this.deny("subscription_blocked", "SYSTEM_DENY", decisionFacts);
    }

    const principalOverrides = (request.principalOverrides ?? []).filter((override) =>
      this.principalOverrideApplies(override, request)
    );
    if (principalOverrides.some(({ effect }) => effect === "deny")) {
      return this.deny("principal_deny", "PRINCIPAL_DENY", decisionFacts);
    }
    if (principalOverrides.some(({ effect }) => effect === "allow")) {
      return {
        allowed: true,
        reason: "principal_allow",
        source: "PRINCIPAL_ALLOW",
        ...decisionFacts
      };
    }

    const bindings = request.bindings
      .filter((binding) => this.bindingApplies(binding, request.resource))
      .slice()
      .sort((left, right) =>
        `${left.role}|${left.resourceId}`.localeCompare(`${right.role}|${right.resourceId}`)
      );
    const roleOverrides = request.roleOverrides ?? [];

    for (const binding of bindings) {
      const matching = roleOverrides.filter((override) =>
        this.roleOverrideApplies(override, binding, request)
      );
      if (
        matching.some(({ effect }) => effect === "allow") &&
        !matching.some(({ effect }) => effect === "deny")
      ) {
        return this.allow("role_override", "ROLE_POLICY", binding.role, decisionFacts);
      }
    }

    for (const binding of bindings) {
      const matching = roleOverrides.filter((override) =>
        this.roleOverrideApplies(override, binding, request)
      );
      if (matching.some(({ effect }) => effect === "deny")) continue;

      const policy = MANAGED_ROLE_POLICIES[binding.role] as readonly PolicyStatement[];
      if (
        policy.some(
          (statement) =>
            statement.effect === "allow" &&
            statement.permission === request.permission &&
            this.statementApplies(statement, binding, request)
        )
      ) {
        return this.allow("managed_role", "CANONICAL_ROLE", binding.role, decisionFacts);
      }
    }

    return this.deny("default_deny", "DEFAULT_DENY", decisionFacts);
  }

  assertAllowed(request: AuthorizationRequest): AuthorizationDecision {
    const decision = this.evaluate(request);
    if (!decision.allowed) {
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

  /**
   * Returns a non-null string describing the problem if the resource object is
   * structurally inconsistent for its declared scope, null when it is valid.
   *
   * Rules:
   *  - A `project`-scoped resource must carry `workspaceId` so cross-workspace checks are safe.
   *  - All other scopes are self-anchoring via `id`.
   */
  private detectMalformedContext(request: AuthorizationRequest): boolean {
    const { resource } = request;
    const permissionMeta = getPermissionMeta(request.permission);
    if (!permissionMeta || !request.context) return true;
    const permissionScope = permissionMeta.resourceScope;
    if (!resource.id || resource.scope !== permissionScope) return true;
    if (resource.scope === "project" && !resource.workspaceId) {
      return true;
    }
    if (
      (resource.scope === "tenant" ||
        resource.scope === "workspace" ||
        resource.scope === "project") &&
      !resource.tenantId
    ) {
      return true;
    }
    if (
      resource.scope === "workspace" &&
      resource.workspaceId &&
      resource.workspaceId !== resource.id
    ) {
      return true;
    }
    if (resource.scope === "project" && resource.projectId && resource.projectId !== resource.id) {
      return true;
    }
    if (resource.scope === "self" && resource.ownerUserId !== request.principalId) return true;
    return false;
  }

  private bindingApplies(binding: ManagedRoleBinding, resource: AuthorizationResource): boolean {
    if (binding.active === false) return false;

    const expectedScope = MANAGED_ROLE_BINDING_SCOPES[binding.role];
    if (binding.bindingScope && binding.bindingScope !== expectedScope) return false;

    return this.resourceAnchor(resource, expectedScope) === binding.resourceId;
  }

  private statementApplies(
    statement: PolicyStatement,
    binding: ManagedRoleBinding,
    request: AuthorizationRequest
  ): boolean {
    if (statement.scope === "self") {
      return (
        (request.resource.ownerUserId ?? request.resource.id) === request.principalId &&
        request.resource.scope === "self"
      );
    }

    return (
      statement.scope === MANAGED_ROLE_BINDING_SCOPES[binding.role] &&
      this.resourceAnchor(request.resource, statement.scope) === binding.resourceId
    );
  }

  private roleOverrideApplies(
    override: RolePermissionOverride,
    binding: ManagedRoleBinding,
    request: AuthorizationRequest
  ): boolean {
    return (
      override.role === binding.role &&
      override.permission === request.permission &&
      override.scope === MANAGED_ROLE_BINDING_SCOPES[binding.role] &&
      override.resourceId === binding.resourceId
    );
  }

  private principalOverrideApplies(
    override: PrincipalPermissionOverride,
    request: AuthorizationRequest
  ): boolean {
    const directResourceMatch =
      override.scope === request.resource.scope && override.resourceId === request.resource.id;
    const workspaceProjectMatch =
      getPermissionMeta(request.permission).resourceFamily === "project" &&
      override.scope === "workspace" &&
      override.resourceId === request.resource.workspaceId;
    return (
      override.principalId === request.principalId &&
      override.permission === request.permission &&
      (directResourceMatch || workspaceProjectMatch)
    );
  }

  private allow(
    reason: "role_override" | "managed_role",
    source: "ROLE_POLICY" | "CANONICAL_ROLE",
    role: ManagedRole,
    facts: Pick<AuthorizationDecision, "policyVersion" | "policyRevision">
  ): AuthorizationDecision {
    return { allowed: true, reason, source, sourceRole: role, role, ...facts };
  }

  private deny(
    reason: Exclude<
      AuthorizationDecisionReason,
      "principal_allow" | "role_override" | "managed_role"
    >,
    source: Exclude<
      AuthorizationDecisionSource,
      "PRINCIPAL_ALLOW" | "ROLE_POLICY" | "CANONICAL_ROLE"
    >,
    facts: Pick<AuthorizationDecision, "policyVersion" | "policyRevision">
  ): AuthorizationDecision {
    return { allowed: false, reason, source, ...facts };
  }

  private resourceAnchor(
    resource: AuthorizationResource,
    scope: ResourceScope
  ): string | undefined {
    switch (scope) {
      case "platform":
        return resource.scope === "platform" ? resource.id : undefined;
      case "tenant":
        return resource.scope === "tenant" ? resource.id : resource.tenantId;
      case "workspace":
        return resource.scope === "workspace" ? resource.id : resource.workspaceId;
      case "project":
        return resource.scope === "project" ? resource.id : resource.projectId;
      case "self":
        return resource.scope === "self" ? resource.id : resource.ownerUserId;
    }
  }
}
