import {
  ErrorCodes,
  MANAGED_ROLE_BINDING_SCOPES,
  MANAGED_ROLE_POLICIES,
  POLICY_VERSION,
  type ManagedRole,
  type Permission,
  type PolicyStatement,
  type PolicyVersion,
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
  tenantIsolationPassed?: boolean;
  accountActive?: boolean;
  subscriptionAllows?: boolean;
}

export interface AuthorizationRequest {
  principalId: string;
  permission: Permission;
  resource: AuthorizationResource;
  bindings: readonly ManagedRoleBinding[];
  context?: AuthorizationContext;
}

export type AuthorizationDecision =
  | {
      allowed: true;
      reason: "managed_role";
      role: ManagedRole;
      matchedPolicyVersion: PolicyVersion;
    }
  | {
      allowed: false;
      reason:
        | "malformed_context"
        | "tenant_isolation"
        | "account_inactive"
        | "subscription_blocked"
        | "default_deny";
    };

@Injectable()
export class AuthorizationPolicyService {
  evaluate(request: AuthorizationRequest): AuthorizationDecision {
    // Step 1: Validate that the resource carries the ancestors needed for its scope.
    const malformed = this.detectMalformedContext(request.resource);
    if (malformed) {
      return { allowed: false, reason: "malformed_context" };
    }

    // Step 2: Mandatory security context checks, evaluated in fixed order.
    if (request.context?.tenantIsolationPassed === false) {
      return { allowed: false, reason: "tenant_isolation" };
    }
    if (request.context?.accountActive === false) {
      return { allowed: false, reason: "account_inactive" };
    }
    if (request.context?.subscriptionAllows === false) {
      return { allowed: false, reason: "subscription_blocked" };
    }

    // Step 3: Evaluate scoped managed-role bindings.
    for (const binding of request.bindings) {
      if (!this.bindingApplies(binding, request.resource)) continue;

      const policy = MANAGED_ROLE_POLICIES[binding.role] as readonly PolicyStatement[];
      const allowed = policy.some(
        (statement) =>
          statement.effect === "allow" &&
          statement.permission === request.permission &&
          this.statementApplies(statement, binding, request)
      );
      if (allowed) {
        return {
          allowed: true,
          reason: "managed_role",
          role: binding.role,
          matchedPolicyVersion: POLICY_VERSION
        };
      }
    }

    // Step 4: Default deny.
    return { allowed: false, reason: "default_deny" };
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
  private detectMalformedContext(resource: AuthorizationResource): string | null {
    if (resource.scope === "project" && !resource.workspaceId) {
      return "project resource missing workspaceId";
    }
    return null;
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
