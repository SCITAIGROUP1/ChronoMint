import type { BatchPolicyMutationDto, PolicyTargetDto } from "@kloqra/contracts";
import { describe, expect, it, vi } from "vitest";
import { permissionAuditEventHash, type PermissionAuditHashFacts } from "./access-policy-hash";
import { AccessPolicyService } from "./access-policy.service";

const roleTarget: PolicyTargetDto = {
  type: "ROLE",
  role: "TENANT_ADMIN",
  scope: "tenant",
  resourceId: "tenant-1"
};

function request(
  configured: "INHERIT" | "ALLOW" | "DENY",
  target: PolicyTargetDto = roleTarget
): BatchPolicyMutationDto {
  return {
    expectedRevision: 0,
    idempotencyKey: "request-0001",
    reason: "Permission policy test",
    atomic: true,
    mutations: [{ permission: "tenant:Access", target, configured }]
  };
}

function harness(options?: {
  revision?: number;
  existingEffect?: "allow" | "deny";
  replay?: { requestHash: string; response: unknown } | null;
  auditFailure?: Error;
  auditEvents?: unknown[];
  lastAuditHash?: string | null;
  tenantMemberRole?: string;
}) {
  const roleRows: Array<Record<string, unknown>> = options?.existingEffect
    ? [
        {
          tenantId: "tenant-1",
          role: "TENANT_ADMIN",
          scope: "tenant",
          resourceId: "tenant-1",
          permission: "tenant:Access",
          effect: options.existingEffect
        }
      ]
    : [];
  const principalRows: Array<Record<string, unknown>> = [];
  const state = {
    tenantId: "tenant-1",
    revision: options?.revision ?? 0,
    policyVersion: "v2",
    policyChecksum: "sha256:4ff207ecc9dd196d6a5bdf8e412990540528d2cc5577dc60aac4b0b54b312530",
    lastAuditHash:
      options?.lastAuditHash ??
      (options?.auditEvents?.at(-1) as { eventHash?: string } | undefined)?.eventHash ??
      null
  };
  const auditCreateMany = options?.auditFailure
    ? vi.fn().mockRejectedValue(options.auditFailure)
    : vi.fn().mockResolvedValue({ count: 1 });
  const tx = {
    permissionPolicyIdempotencyRecord: {
      findUnique: vi.fn().mockResolvedValue(options?.replay ?? null),
      create: vi.fn().mockResolvedValue({})
    },
    tenantPermissionPolicyState: {
      upsert: vi.fn().mockResolvedValue(state),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn().mockResolvedValue(state),
      findUniqueOrThrow: vi.fn().mockResolvedValue(state),
      update: vi.fn().mockImplementation(async ({ data }) => {
        state.lastAuditHash = data.lastAuditHash;
        return state;
      })
    },
    tenantRolePermissionOverride: {
      findMany: vi
        .fn()
        .mockImplementation(async ({ where }) =>
          roleRows.filter(
            (row) =>
              row.role === where.role &&
              (!where.permission?.in || where.permission.in.includes(row.permission))
          )
        ),
      upsert: vi.fn().mockImplementation(async ({ create, update }) => {
        const found = roleRows.find((row) => row.permission === create.permission);
        if (found) Object.assign(found, update);
        else roleRows.push(create);
        return found ?? create;
      }),
      deleteMany: vi.fn().mockImplementation(async ({ where }) => {
        const index = roleRows.findIndex((row) => row.permission === where.permission);
        if (index >= 0) roleRows.splice(index, 1);
        return { count: index >= 0 ? 1 : 0 };
      })
    },
    principalPermissionOverride: {
      findMany: vi.fn().mockResolvedValue(principalRows),
      upsert: vi.fn().mockImplementation(async ({ create }) => {
        principalRows.push(create);
        return create;
      }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 })
    },
    permissionPolicyAuditEvent: {
      createMany: auditCreateMany,
      findMany: vi.fn().mockResolvedValue(options?.auditEvents ?? [])
    },
    tenantMember: {
      findUnique: vi.fn().mockResolvedValue({
        tenantId: "tenant-1",
        role: options?.tenantMemberRole ?? "ADMIN"
      })
    },
    workspace: { findUnique: vi.fn() },
    project: { findUnique: vi.fn() },
    workspaceMember: {
      findUnique: vi.fn(),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([])
    },
    teamMember: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([])
    }
  };
  const repository = {
    transaction: vi.fn(async (work) => work(tx)),
    client: vi.fn(() => tx),
    ensureState: vi.fn(async () => state),
    loadTargetOverrides: vi.fn(async (_tx, _tenantId, target, permissions) => {
      const rows = target.type === "ROLE" ? roleRows : principalRows;
      return rows.filter((row) => !permissions || permissions.includes(row.permission as string));
    })
  };
  return {
    service: new AccessPolicyService(repository as never),
    repository,
    tx,
    roleRows,
    principalRows
  };
}

describe("AccessPolicyService", () => {
  it("writes allow and deny overrides with one revision and effective audit facts", async () => {
    const allow = harness();
    const allowResult = await allow.service.mutate({
      tenantId: "tenant-1",
      actorPrincipalId: "owner-1",
      request: request("ALLOW")
    });
    expect(allowResult.revision).toBe(1);
    expect(allowResult.items[0]).toMatchObject({ configured: "ALLOW", effective: "ALLOW" });
    expect(allow.tx.tenantPermissionPolicyState.updateMany).toHaveBeenCalledTimes(1);
    expect(allow.tx.permissionPolicyAuditEvent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          beforeEffect: null,
          afterEffect: "allow",
          effectiveBefore: "allow",
          effectiveAfter: "allow"
        })
      ]
    });

    const deny = harness();
    const denyResult = await deny.service.mutate({
      tenantId: "tenant-1",
      actorPrincipalId: "owner-1",
      request: request("DENY")
    });
    expect(denyResult.items[0]).toMatchObject({ configured: "DENY", effective: "DENY" });
  });

  it("represents INHERIT by deleting the override and restoring canonical access", async () => {
    const { service, tx, roleRows } = harness({ existingEffect: "deny" });
    const result = await service.mutate({
      tenantId: "tenant-1",
      actorPrincipalId: "owner-1",
      request: request("INHERIT")
    });
    expect(tx.tenantRolePermissionOverride.deleteMany).toHaveBeenCalled();
    expect(roleRows).toHaveLength(0);
    expect(result.items[0]).toMatchObject({ configured: "INHERIT", effective: "ALLOW" });
  });

  it("persists principal overrides separately and gives principal deny precedence", async () => {
    const target: PolicyTargetDto = {
      type: "PRINCIPAL",
      principalId: "member-1",
      scope: "tenant",
      resourceId: "tenant-1"
    };
    const { service, tx } = harness();
    const result = await service.mutate({
      tenantId: "tenant-1",
      actorPrincipalId: "owner-1",
      request: request("DENY", target)
    });
    expect(tx.principalPermissionOverride.upsert).toHaveBeenCalled();
    expect(result.items[0]).toMatchObject({
      configured: "DENY",
      effective: "DENY",
      source: "PRINCIPAL_DENY"
    });
  });

  it("rejects stale revisions before any override or audit write", async () => {
    const { service, tx } = harness({ revision: 2 });
    await expect(
      service.mutate({
        tenantId: "tenant-1",
        actorPrincipalId: "owner-1",
        request: request("ALLOW")
      })
    ).rejects.toMatchObject({ status: 409 });
    expect(tx.tenantRolePermissionOverride.upsert).not.toHaveBeenCalled();
    expect(tx.permissionPolicyAuditEvent.createMany).not.toHaveBeenCalled();
  });

  it("replays the same idempotent response without incrementing revision", async () => {
    const first = harness();
    const payload = request("ALLOW");
    const result = await first.service.mutate({
      tenantId: "tenant-1",
      actorPrincipalId: "owner-1",
      request: payload
    });
    const stored = first.tx.permissionPolicyIdempotencyRecord.create.mock.calls[0][0].data;
    const replay = harness({
      replay: { requestHash: stored.requestHash, response: result }
    });
    await expect(
      replay.service.mutate({
        tenantId: "tenant-1",
        actorPrincipalId: "owner-1",
        request: payload
      })
    ).resolves.toEqual(result);
    expect(replay.tx.tenantPermissionPolicyState.updateMany).not.toHaveBeenCalled();
  });

  it("rejects reuse of an idempotency key for a different request", async () => {
    const replay = harness({
      replay: { requestHash: "different-request", response: { revision: 1 } }
    });
    await expect(
      replay.service.mutate({
        tenantId: "tenant-1",
        actorPrincipalId: "owner-1",
        request: request("ALLOW")
      })
    ).rejects.toMatchObject({ status: 409 });
    expect(replay.tx.tenantPermissionPolicyState.updateMany).not.toHaveBeenCalled();
  });

  it("rejects multi-target and duplicate-permission batches", async () => {
    const { service, repository } = harness();
    const multi = request("ALLOW");
    multi.mutations.push({
      permission: "tenant:ReadOrganization",
      configured: "ALLOW",
      target: { ...roleTarget, resourceId: "tenant-2" }
    });
    await expect(
      service.mutate({
        tenantId: "tenant-1",
        actorPrincipalId: "owner-1",
        request: multi
      })
    ).rejects.toMatchObject({ status: 400 });
    expect(repository.transaction).not.toHaveBeenCalled();
  });

  it("rejects immutable managed-role targets before opening a transaction", async () => {
    const { service, repository } = harness();
    await expect(
      service.mutate({
        tenantId: "tenant-1",
        actorPrincipalId: "owner-1",
        request: request("ALLOW", {
          type: "ROLE",
          role: "TENANT_OWNER",
          scope: "tenant",
          resourceId: "tenant-1"
        })
      })
    ).rejects.toMatchObject({ status: 400 });
    expect(repository.transaction).not.toHaveBeenCalled();
  });

  it("detects cross-tenant targets before policy writes", async () => {
    const { service, tx } = harness();
    await expect(
      service.mutate({
        tenantId: "tenant-1",
        actorPrincipalId: "owner-1",
        request: request("ALLOW", { ...roleTarget, resourceId: "tenant-2" })
      })
    ).rejects.toMatchObject({ status: 404 });
    expect(tx.tenantPermissionPolicyState.updateMany).not.toHaveBeenCalled();
  });

  it("does not store replay evidence when audit insertion fails", async () => {
    const { service, tx } = harness({ auditFailure: new Error("audit unavailable") });
    await expect(
      service.mutate({
        tenantId: "tenant-1",
        actorPrincipalId: "owner-1",
        request: request("ALLOW")
      })
    ).rejects.toThrow("audit unavailable");
    expect(tx.permissionPolicyIdempotencyRecord.create).not.toHaveBeenCalled();
    expect(tx.tenantPermissionPolicyState.update).not.toHaveBeenCalled();
  });

  it("verifies deterministic chains and reports tampering", async () => {
    const facts: PermissionAuditHashFacts = {
      tenantId: "tenant-1",
      revision: 1,
      eventIndex: 0,
      actorPrincipalId: "owner-1",
      targetType: "ROLE",
      targetId: "role:TENANT_ADMIN",
      role: "TENANT_ADMIN",
      scope: "tenant",
      resourceId: "tenant-1",
      permission: "tenant:Access",
      beforeEffect: null,
      afterEffect: "allow",
      effectiveBefore: "allow",
      effectiveAfter: "allow",
      reason: "Permission policy test",
      idempotencyKey: "request-0001",
      previousHash: null
    };
    const event = {
      id: "audit-1",
      ...facts,
      eventHash: permissionAuditEventHash(facts)
    };
    const valid = harness({ auditEvents: [event] });
    await expect(valid.service.verifyAuditChain("tenant-1")).resolves.toEqual({
      valid: true,
      checked: 1
    });

    const tampered = harness({
      auditEvents: [{ ...event, effectiveAfter: "deny" }]
    });
    await expect(tampered.service.verifyAuditChain("tenant-1")).resolves.toMatchObject({
      valid: false,
      checked: 0,
      invalidEventId: "audit-1"
    });

    const truncated = harness({ auditEvents: [], lastAuditHash: event.eventHash });
    await expect(truncated.service.verifyAuditChain("tenant-1")).resolves.toMatchObject({
      valid: false,
      checked: 0,
      expectedHash: event.eventHash
    });
  });

  it("loads policy documents for workspace members who are not tenant members", async () => {
    const { service, tx } = harness();
    tx.tenantMember.findUnique.mockResolvedValue(null);
    tx.workspace.findUnique.mockResolvedValue({ tenantId: "tenant-1" });
    tx.workspaceMember.findFirst.mockResolvedValue({ id: "wm-1" });
    tx.workspaceMember.findMany.mockResolvedValue([
      { role: "ADMIN", isActive: true, userId: "ws-user-1" }
    ]);
    tx.teamMember.findMany.mockResolvedValue([]);

    await expect(
      service.document("tenant-1", {
        type: "PRINCIPAL",
        principalId: "ws-user-1",
        scope: "workspace",
        resourceId: "workspace-1"
      })
    ).resolves.toMatchObject({
      target: {
        type: "PRINCIPAL",
        principalId: "ws-user-1",
        scope: "workspace",
        resourceId: "workspace-1"
      }
    });
  });
});
