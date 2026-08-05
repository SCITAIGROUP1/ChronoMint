import { ErrorCodes, POLICY_CHECKSUM, POLICY_VERSION } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { DomainException } from "../errors/domain.exception";
import {
  AuthorizationPolicyService,
  type AuthorizationRequest
} from "./authorization-policy.service";

const service = new AuthorizationPolicyService();
const policyState = {
  policyVersion: POLICY_VERSION,
  policyChecksum: POLICY_CHECKSUM,
  revision: 17
};
const context = {
  tenantIsolationPassed: true,
  accountActive: true,
  subscriptionAllows: true
};

const projectRequest = (overrides: Partial<AuthorizationRequest> = {}): AuthorizationRequest => ({
  principalId: "user-1",
  permission: "project:ManageTasks",
  resource: {
    scope: "project",
    id: "project-1",
    projectId: "project-1",
    workspaceId: "workspace-1",
    tenantId: "tenant-1"
  },
  bindings: [
    {
      role: "PROJECT_MANAGER",
      resourceId: "project-1",
      bindingScope: "project",
      active: true
    }
  ],
  context,
  policyState,
  ...overrides
});

describe("AuthorizationPolicyService", () => {
  it.each([
    {
      name: "canonical role",
      input: {},
      allowed: true,
      source: "CANONICAL_ROLE",
      sourceRole: "PROJECT_MANAGER"
    },
    {
      name: "role allow overrides a role without a canonical grant",
      input: {
        bindings: [
          {
            role: "WORKSPACE_MEMBER",
            resourceId: "workspace-1",
            bindingScope: "workspace",
            active: true
          }
        ],
        roleOverrides: [
          {
            role: "WORKSPACE_MEMBER",
            permission: "project:ManageTasks",
            effect: "allow",
            scope: "workspace",
            resourceId: "workspace-1"
          }
        ]
      },
      allowed: true,
      source: "ROLE_POLICY",
      sourceRole: "WORKSPACE_MEMBER"
    },
    {
      name: "principal allow beats role deny",
      input: {
        roleOverrides: [
          {
            role: "PROJECT_MANAGER",
            permission: "project:ManageTasks",
            effect: "deny",
            scope: "project",
            resourceId: "project-1"
          }
        ],
        principalOverrides: [
          {
            principalId: "user-1",
            permission: "project:ManageTasks",
            effect: "allow",
            scope: "project",
            resourceId: "project-1"
          }
        ]
      },
      allowed: true,
      source: "PRINCIPAL_ALLOW",
      sourceRole: undefined
    },
    {
      name: "principal deny beats principal allow and every role allow",
      input: {
        principalOverrides: [
          {
            principalId: "user-1",
            permission: "project:ManageTasks",
            effect: "allow",
            scope: "project",
            resourceId: "project-1"
          },
          {
            principalId: "user-1",
            permission: "project:ManageTasks",
            effect: "deny",
            scope: "project",
            resourceId: "project-1"
          }
        ]
      },
      allowed: false,
      source: "PRINCIPAL_DENY",
      sourceRole: undefined
    }
  ])("$name", ({ input, allowed, source, sourceRole }) => {
    const decision = service.evaluate(projectRequest(input as Partial<AuthorizationRequest>));
    expect(decision).toMatchObject({
      allowed,
      source,
      policyVersion: POLICY_VERSION,
      policyRevision: 17
    });
    expect(decision.sourceRole).toBe(sourceRole);
  });

  it("a role deny affects only that role in a multi-role union", () => {
    const decision = service.evaluate(
      projectRequest({
        permission: "project:Read",
        bindings: [
          {
            role: "WORKSPACE_ADMIN",
            resourceId: "workspace-1",
            bindingScope: "workspace"
          },
          {
            role: "PROJECT_MANAGER",
            resourceId: "project-1",
            bindingScope: "project"
          }
        ],
        roleOverrides: [
          {
            role: "WORKSPACE_ADMIN",
            permission: "project:Read",
            effect: "deny",
            scope: "workspace",
            resourceId: "workspace-1"
          }
        ]
      })
    );

    expect(decision).toMatchObject({
      allowed: true,
      source: "CANONICAL_ROLE",
      sourceRole: "PROJECT_MANAGER"
    });
  });

  it("applies a workspace-scoped principal override to a child project", () => {
    const decision = service.evaluate(
      projectRequest({
        principalOverrides: [
          {
            principalId: "user-1",
            permission: "project:ManageTasks",
            effect: "deny",
            scope: "workspace",
            resourceId: "workspace-1"
          }
        ]
      })
    );

    expect(decision).toMatchObject({
      allowed: false,
      reason: "principal_deny",
      source: "PRINCIPAL_DENY"
    });
  });

  it.each([
    [
      "foreign role resource",
      {
        roleOverrides: [
          {
            role: "PROJECT_MANAGER",
            permission: "project:ManageTasks",
            effect: "allow",
            scope: "project",
            resourceId: "project-2"
          }
        ]
      }
    ],
    [
      "foreign principal",
      {
        principalOverrides: [
          {
            principalId: "user-2",
            permission: "project:ManageTasks",
            effect: "deny",
            scope: "project",
            resourceId: "project-1"
          }
        ]
      }
    ],
    [
      "foreign principal resource",
      {
        principalOverrides: [
          {
            principalId: "user-1",
            permission: "project:ManageTasks",
            effect: "deny",
            scope: "project",
            resourceId: "project-2"
          }
        ]
      }
    ],
    [
      "foreign principal scope",
      {
        principalOverrides: [
          {
            principalId: "user-1",
            permission: "project:ManageTasks",
            effect: "deny",
            scope: "workspace",
            resourceId: "project-1"
          }
        ]
      }
    ]
  ])("ignores override scope mismatch: %s", (_name, input) => {
    expect(
      service.evaluate(
        projectRequest({
          bindings: [],
          ...(input as Partial<AuthorizationRequest>)
        })
      )
    ).toMatchObject({ allowed: false, source: "DEFAULT_DENY" });
  });

  it.each([
    [
      "tenant isolation",
      { tenantIsolationPassed: false, accountActive: true, subscriptionAllows: true },
      "tenant_isolation"
    ],
    [
      "inactive account",
      { tenantIsolationPassed: true, accountActive: false, subscriptionAllows: true },
      "account_inactive"
    ],
    [
      "blocked subscription",
      { tenantIsolationPassed: true, accountActive: true, subscriptionAllows: false },
      "subscription_blocked"
    ]
  ])("immutable %s denial wins over persisted allows", (_name, deniedContext, reason) => {
    const decision = service.evaluate(
      projectRequest({
        context: deniedContext,
        principalOverrides: [
          {
            principalId: "user-1",
            permission: "project:ManageTasks",
            effect: "allow",
            scope: "project",
            resourceId: "project-1"
          }
        ]
      })
    );
    expect(decision).toMatchObject({ allowed: false, source: "SYSTEM_DENY", reason });
  });

  it.each([
    ["missing", undefined, "policy_state_missing", null],
    ["wrong version", { ...policyState, policyVersion: "v1" }, "policy_state_invalid", 17],
    [
      "wrong checksum",
      { ...policyState, policyChecksum: "sha256:invalid" },
      "policy_state_invalid",
      17
    ],
    ["negative revision", { ...policyState, revision: -1 }, "policy_state_invalid", -1]
  ])("fails closed for %s policy state", (_name, state, reason, revision) => {
    expect(service.evaluate(projectRequest({ policyState: state }))).toMatchObject({
      allowed: false,
      source: "SYSTEM_DENY",
      reason,
      policyRevision: revision
    });
  });

  it("rejects permission/resource scope mismatch and incomplete ancestry", () => {
    expect(
      service.evaluate(
        projectRequest({
          permission: "workspace:ManageMembers",
          resource: {
            scope: "project",
            id: "project-1",
            projectId: "project-1",
            workspaceId: "workspace-1",
            tenantId: "tenant-1"
          }
        })
      )
    ).toMatchObject({ allowed: false, reason: "malformed_context" });

    expect(
      service.evaluate(
        projectRequest({
          resource: {
            scope: "project",
            id: "project-1",
            projectId: "project-1",
            tenantId: "tenant-1"
          }
        })
      )
    ).toMatchObject({ allowed: false, reason: "malformed_context" });
  });

  it("returns the effective source, exact revision, and policy version only", () => {
    const decision = service.evaluate(
      projectRequest({
        policyState: { ...policyState, revision: 42 }
      })
    );

    expect(decision).toEqual({
      allowed: true,
      reason: "managed_role",
      source: "CANONICAL_ROLE",
      sourceRole: "PROJECT_MANAGER",
      role: "PROJECT_MANAGER",
      policyVersion: POLICY_VERSION,
      policyRevision: 42
    });
    expect(decision).not.toHaveProperty("principalId");
    expect(decision).not.toHaveProperty("resourceId");
    expect(decision).not.toHaveProperty("policyChecksum");
  });

  it("throws a stable, sanitized forbidden domain error", () => {
    expect(() =>
      service.assertAllowed(
        projectRequest({
          bindings: []
        })
      )
    ).toThrowError(DomainException);

    try {
      service.assertAllowed(projectRequest({ bindings: [] }));
    } catch (error) {
      expect(error).toMatchObject({ code: ErrorCodes.FORBIDDEN });
      expect((error as DomainException).getResponse()).toMatchObject({
        details: {
          reason: "default_deny",
          source: "DEFAULT_DENY",
          policyVersion: POLICY_VERSION,
          policyRevision: 17,
          permission: "project:ManageTasks",
          resourceScope: "project"
        }
      });
    }
  });
});
