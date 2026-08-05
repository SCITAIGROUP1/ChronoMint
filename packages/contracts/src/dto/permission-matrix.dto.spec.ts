import { describe, expect, it } from "vitest";
import {
  batchPolicyMutationSchema,
  permissionPolicyDocumentSchema,
  policyConflictResponseSchema,
  policyDirectoryQuerySchema,
  principalPolicyDirectorySchema,
  resetPolicySchema,
  rolePolicyDirectorySchema
} from "./permission-matrix.dto";

const roleTarget = {
  type: "ROLE" as const,
  role: "WORKSPACE_MEMBER" as const,
  scope: "workspace" as const,
  resourceId: "workspace-1"
};

describe("permission matrix v2 DTOs", () => {
  it("models configured, effective, and source independently", () => {
    const parsed = permissionPolicyDocumentSchema.parse({
      policyVersion: "v2",
      policyChecksum: `sha256:${"a".repeat(64)}`,
      revision: 7,
      target: roleTarget,
      items: [
        {
          permission: "workspace:ReadReports",
          target: roleTarget,
          configured: "INHERIT",
          effective: "DENY",
          source: "DEFAULT_DENY"
        }
      ]
    });
    expect(parsed.items[0]).toMatchObject({
      configured: "INHERIT",
      effective: "DENY",
      source: "DEFAULT_DENY"
    });
  });

  it("requires atomic, revisioned, idempotent batch mutations with a reason", () => {
    const valid = batchPolicyMutationSchema.safeParse({
      expectedRevision: 7,
      idempotencyKey: "policy-change-0001",
      reason: "Grant reporting access",
      atomic: true,
      mutations: [
        {
          permission: "workspace:ReadReports",
          target: roleTarget,
          configured: "ALLOW"
        },
        {
          permission: "workspace:CreateExport",
          target: roleTarget,
          configured: "DENY"
        }
      ]
    });
    expect(valid.success).toBe(true);
    expect(
      batchPolicyMutationSchema.safeParse({
        expectedRevision: 7,
        idempotencyKey: "policy-change-0001",
        reason: "Grant reporting access",
        atomic: false,
        mutations: []
      }).success
    ).toBe(false);
  });

  it("requires reset mutations to carry target, revision, idempotency, and reason", () => {
    expect(
      resetPolicySchema.safeParse({
        expectedRevision: 3,
        idempotencyKey: "reset-policy-0001",
        reason: "Restore canonical defaults",
        target: roleTarget
      }).success
    ).toBe(true);
    expect(resetPolicySchema.safeParse({ target: roleTarget }).success).toBe(false);
  });

  it("returns field-level optimistic concurrency conflicts", () => {
    const conflict = policyConflictResponseSchema.parse({
      code: "POLICY_CONFLICT",
      expectedRevision: 4,
      actualRevision: 6,
      conflicts: [
        {
          mutationIndex: 0,
          field: "configured",
          expected: "INHERIT",
          actual: "DENY",
          message: "The permission changed after the draft was opened."
        }
      ]
    });
    expect(conflict.conflicts[0]?.field).toBe("configured");
  });

  it("supports scoped, paginated role and principal directories", () => {
    expect(policyDirectoryQuerySchema.parse({})).toEqual({ page: 1, limit: 25 });
    expect(
      rolePolicyDirectorySchema.safeParse({
        items: [
          {
            target: roleTarget,
            displayName: "Workspace Member",
            immutable: false,
            customizationEnabled: true,
            overrideCount: 1
          }
        ],
        page: 1,
        limit: 25,
        total: 1,
        totalPages: 1
      }).success
    ).toBe(true);
    expect(
      principalPolicyDirectorySchema.safeParse({
        items: [
          {
            target: {
              type: "PRINCIPAL",
              principalId: "user-1",
              scope: "workspace",
              resourceId: "workspace-1"
            },
            displayName: "Sam Rivera",
            email: "sam@example.com",
            active: true,
            roles: ["WORKSPACE_MEMBER"],
            overrideCount: 0
          }
        ],
        page: 1,
        limit: 25,
        total: 1,
        totalPages: 1
      }).success
    ).toBe(true);
  });

  it("rejects unscoped targets and unknown permission IDs", () => {
    expect(
      batchPolicyMutationSchema.safeParse({
        expectedRevision: 1,
        idempotencyKey: "policy-change-0002",
        reason: "Invalid unscoped mutation",
        atomic: true,
        mutations: [
          {
            permission: "workspace:BecomeOwner",
            target: { type: "ROLE", role: "WORKSPACE_MEMBER", scope: "workspace" },
            configured: "ALLOW"
          }
        ]
      }).success
    ).toBe(false);
  });
});
