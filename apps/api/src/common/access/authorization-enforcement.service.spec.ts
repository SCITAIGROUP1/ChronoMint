import { ErrorCodes, POLICY_CHECKSUM, POLICY_VERSION } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizationEnforcementService } from "./authorization-enforcement.service";
import { AuthorizationPolicyService } from "./authorization-policy.service";

describe("AuthorizationEnforcementService", () => {
  const db = {
    project: {
      findUnique: vi.fn()
    }
  };
  const repository = {
    transaction: vi.fn(async (work: (tx: typeof db) => unknown) => work(db)),
    loadEvaluationSnapshot: vi.fn()
  };
  const bindings = {
    forProject: vi.fn()
  };
  const service = new AuthorizationEnforcementService(
    repository as never,
    bindings as never,
    new AuthorizationPolicyService()
  );

  beforeEach(() => {
    vi.clearAllMocks();
    db.project.findUnique.mockResolvedValue({
      id: "project-1",
      workspaceId: "workspace-1",
      workspace: {
        tenantId: "tenant-1",
        tenant: {
          status: "active",
          subscription: { status: "active" }
        }
      }
    });
    bindings.forProject.mockResolvedValue({
      isolationPassed: true,
      bindings: [
        {
          role: "PROJECT_MANAGER",
          resourceId: "project-1",
          bindingScope: "project",
          active: true
        }
      ]
    });
    repository.loadEvaluationSnapshot.mockResolvedValue({
      state: {
        policyVersion: POLICY_VERSION,
        policyChecksum: POLICY_CHECKSUM,
        revision: 9
      },
      roleOverrides: [],
      principalOverrides: []
    });
  });

  it("resolves trusted ancestry and applies persisted principal precedence", async () => {
    repository.loadEvaluationSnapshot.mockResolvedValue({
      state: {
        policyVersion: POLICY_VERSION,
        policyChecksum: POLICY_CHECKSUM,
        revision: 10
      },
      roleOverrides: [
        {
          role: "PROJECT_MANAGER",
          permission: "project:ManageTasks",
          effect: "allow",
          scope: "project",
          resourceId: "project-1"
        }
      ],
      principalOverrides: [
        {
          principalId: "user-1",
          permission: "project:ManageTasks",
          effect: "deny",
          scope: "project",
          resourceId: "project-1"
        }
      ]
    });

    await expect(
      service.evaluate({
        principalId: "user-1",
        permission: "project:ManageTasks",
        resource: {
          scope: "project",
          projectId: "project-1",
          expectedWorkspaceId: "workspace-1",
          expectedTenantId: "tenant-1"
        }
      })
    ).resolves.toMatchObject({
      allowed: false,
      source: "PRINCIPAL_DENY",
      policyVersion: POLICY_VERSION,
      policyRevision: 10
    });
  });

  it("fails closed when persisted policy state is absent", async () => {
    repository.loadEvaluationSnapshot.mockResolvedValue({
      state: null,
      roleOverrides: [],
      principalOverrides: []
    });

    await expect(
      service.evaluate({
        principalId: "user-1",
        permission: "project:ManageTasks",
        resource: { scope: "project", projectId: "project-1" }
      })
    ).resolves.toMatchObject({
      allowed: false,
      reason: "policy_state_missing",
      source: "SYSTEM_DENY",
      policyRevision: null
    });
  });

  it("keeps account and subscription denial immutable", async () => {
    db.project.findUnique.mockResolvedValue({
      id: "project-1",
      workspaceId: "workspace-1",
      workspace: {
        tenantId: "tenant-1",
        tenant: {
          status: "active",
          subscription: { status: "past_due" }
        }
      }
    });
    repository.loadEvaluationSnapshot.mockResolvedValue({
      state: {
        policyVersion: POLICY_VERSION,
        policyChecksum: POLICY_CHECKSUM,
        revision: 11
      },
      roleOverrides: [],
      principalOverrides: [
        {
          principalId: "user-1",
          permission: "project:ManageTasks",
          effect: "allow",
          scope: "project",
          resourceId: "project-1"
        }
      ]
    });

    await expect(
      service.evaluate({
        principalId: "user-1",
        permission: "project:ManageTasks",
        resource: { scope: "project", projectId: "project-1" }
      })
    ).resolves.toMatchObject({
      allowed: false,
      reason: "subscription_blocked",
      source: "SYSTEM_DENY",
      policyRevision: 11,
      subscriptionStatus: "past_due"
    });

    await expect(
      service.assertAllowed({
        principalId: "user-1",
        permission: "project:ManageTasks",
        resource: { scope: "project", projectId: "project-1" }
      })
    ).rejects.toSatisfy(
      (err: { code: string; getStatus: () => number; getResponse: () => unknown }) =>
        err.code === ErrorCodes.PAYMENT_REQUIRED &&
        err.getStatus() === HttpStatus.PAYMENT_REQUIRED &&
        (err.getResponse() as { details?: { status?: string } }).details?.status === "past_due"
    );
  });
});
