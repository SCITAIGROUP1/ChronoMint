import { ErrorCodes } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { DomainException } from "../errors/domain.exception";
import { AuthorizationPolicyService } from "./authorization-policy.service";

const service = new AuthorizationPolicyService();

describe("AuthorizationPolicyService", () => {
  it("allows a workspace admin to manage members in its workspace", () => {
    const decision = service.evaluate({
      principalId: "user-1",
      permission: "workspace:ManageMembers",
      resource: { scope: "workspace", id: "ws-1", tenantId: "tenant-1" },
      bindings: [{ role: "WORKSPACE_ADMIN", resourceId: "ws-1" }]
    });

    expect(decision).toEqual({
      allowed: true,
      role: "WORKSPACE_ADMIN",
      reason: "managed_role",
      matchedPolicyVersion: "v1"
    });
  });

  it("denies the same workspace role in another workspace", () => {
    const decision = service.evaluate({
      principalId: "user-1",
      permission: "workspace:ManageMembers",
      resource: { scope: "workspace", id: "ws-2", tenantId: "tenant-1" },
      bindings: [{ role: "WORKSPACE_ADMIN", resourceId: "ws-1" }]
    });

    expect(decision).toEqual({ allowed: false, reason: "default_deny" });
  });

  it("allows workspace-admin project policy only for child projects", () => {
    expect(
      service.evaluate({
        principalId: "user-1",
        permission: "project:ManageTasks",
        resource: {
          scope: "project",
          id: "project-1",
          projectId: "project-1",
          workspaceId: "ws-1",
          tenantId: "tenant-1"
        },
        bindings: [{ role: "WORKSPACE_ADMIN", resourceId: "ws-1" }]
      }).allowed
    ).toBe(true);

    expect(
      service.evaluate({
        principalId: "user-1",
        permission: "project:ManageTasks",
        resource: {
          scope: "project",
          id: "project-2",
          projectId: "project-2",
          workspaceId: "ws-2",
          tenantId: "tenant-1"
        },
        bindings: [{ role: "WORKSPACE_ADMIN", resourceId: "ws-1" }]
      }).allowed
    ).toBe(false);
  });

  it("limits project managers to their bound project", () => {
    const bindings = [{ role: "PROJECT_MANAGER", resourceId: "project-1" }] as const;

    expect(
      service.evaluate({
        principalId: "user-1",
        permission: "project:ReviewTimesheets",
        resource: {
          scope: "project",
          id: "project-1",
          projectId: "project-1",
          workspaceId: "ws-1"
        },
        bindings
      }).allowed
    ).toBe(true);
    expect(
      service.evaluate({
        principalId: "user-1",
        permission: "project:ReviewTimesheets",
        resource: {
          scope: "project",
          id: "project-2",
          projectId: "project-2",
          workspaceId: "ws-1"
        },
        bindings
      }).allowed
    ).toBe(false);
  });

  it("requires self ownership and matching workspace for personal permissions", () => {
    const bindings = [{ role: "WORKSPACE_MEMBER", resourceId: "ws-1" }] as const;

    expect(
      service.evaluate({
        principalId: "user-1",
        permission: "personal:ManageTimelogs",
        resource: {
          scope: "self",
          id: "user-1",
          ownerUserId: "user-1",
          workspaceId: "ws-1"
        },
        bindings
      }).allowed
    ).toBe(true);
    expect(
      service.evaluate({
        principalId: "user-1",
        permission: "personal:ManageTimelogs",
        resource: {
          scope: "self",
          id: "user-2",
          ownerUserId: "user-2",
          workspaceId: "ws-1"
        },
        bindings
      }).allowed
    ).toBe(false);
  });

  it("does not turn tenant ownership into workspace access", () => {
    const decision = service.evaluate({
      principalId: "owner-1",
      permission: "workspace:ReadReports",
      resource: { scope: "workspace", id: "ws-1", workspaceId: "ws-1", tenantId: "tenant-1" },
      bindings: [{ role: "TENANT_OWNER", resourceId: "tenant-1" }]
    });

    expect(decision.allowed).toBe(false);
  });

  it("applies isolation, account, and subscription denies before role allows", () => {
    const request = {
      principalId: "user-1",
      permission: "personal:ManageTimer" as const,
      resource: {
        scope: "self" as const,
        id: "user-1",
        ownerUserId: "user-1",
        workspaceId: "ws-1"
      },
      bindings: [{ role: "WORKSPACE_MEMBER" as const, resourceId: "ws-1" }]
    };

    expect(service.evaluate({ ...request, context: { tenantIsolationPassed: false } }).reason).toBe(
      "tenant_isolation"
    );
    expect(service.evaluate({ ...request, context: { accountActive: false } }).reason).toBe(
      "account_inactive"
    );
    expect(service.evaluate({ ...request, context: { subscriptionAllows: false } }).reason).toBe(
      "subscription_blocked"
    );
  });

  it("ignores inactive or malformed role bindings", () => {
    const resource = { scope: "workspace" as const, id: "ws-1", workspaceId: "ws-1" };

    expect(
      service.evaluate({
        principalId: "user-1",
        permission: "workspace:ManageMembers",
        resource,
        bindings: [{ role: "WORKSPACE_ADMIN", resourceId: "ws-1", active: false }]
      }).allowed
    ).toBe(false);
    expect(
      service.evaluate({
        principalId: "user-1",
        permission: "workspace:ManageMembers",
        resource,
        bindings: [
          {
            role: "WORKSPACE_ADMIN",
            resourceId: "ws-1",
            bindingScope: "tenant"
          }
        ]
      }).allowed
    ).toBe(false);
  });

  it("throws a stable forbidden domain error", () => {
    try {
      service.assertAllowed({
        principalId: "user-1",
        permission: "workspace:ManageMembers",
        resource: { scope: "workspace", id: "ws-1", workspaceId: "ws-1" },
        bindings: [{ role: "WORKSPACE_MEMBER", resourceId: "ws-1" }]
      });
      expect.fail("expected authorization failure");
    } catch (error) {
      expect(error).toBeInstanceOf(DomainException);
      expect((error as DomainException).code).toBe(ErrorCodes.FORBIDDEN);
      expect((error as DomainException).getResponse()).toMatchObject({
        details: {
          reason: "default_deny",
          permission: "workspace:ManageMembers",
          resourceScope: "workspace"
        }
      });
    }
  });

  it("returns malformed_context for a project resource missing workspaceId", () => {
    const decision = service.evaluate({
      principalId: "user-1",
      permission: "project:ManageTasks",
      resource: { scope: "project", id: "project-1", projectId: "project-1" }, // no workspaceId
      bindings: [{ role: "PROJECT_MANAGER", resourceId: "project-1" }]
    });
    expect(decision).toEqual({ allowed: false, reason: "malformed_context" });
  });

  it("multi-role union grants access when any binding matches", () => {
    const decision = service.evaluate({
      principalId: "user-1",
      permission: "project:ReviewTimesheets",
      resource: {
        scope: "project",
        id: "project-1",
        projectId: "project-1",
        workspaceId: "ws-1",
        tenantId: "tenant-1"
      },
      // Has both workspace-member (insufficient) and project-manager (sufficient)
      bindings: [
        { role: "WORKSPACE_MEMBER", resourceId: "ws-1" },
        { role: "PROJECT_MANAGER", resourceId: "project-1" }
      ]
    });
    expect(decision.allowed).toBe(true);
    if (decision.allowed) {
      expect(decision.matchedPolicyVersion).toBe("v1");
      expect(decision.role).toBe("PROJECT_MANAGER");
    }
  });

  it("malformed_context fires before all other checks including isolation", () => {
    const decision = service.evaluate({
      principalId: "user-1",
      permission: "project:ManageTasks",
      resource: { scope: "project", id: "project-1" }, // missing workspaceId
      bindings: [{ role: "PROJECT_MANAGER", resourceId: "project-1" }],
      context: { tenantIsolationPassed: false } // would deny independently
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("malformed_context");
  });
});
