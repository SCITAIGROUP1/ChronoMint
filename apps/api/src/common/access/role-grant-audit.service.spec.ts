import { describe, expect, it, vi } from "vitest";
import { RoleGrantAuditService } from "./role-grant-audit.service";

describe("RoleGrantAuditService", () => {
  it("records actor, target, scope, reason, and outcome through the mutation transaction", async () => {
    const tx = {
      roleGrantAuditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) }
    };
    const service = new RoleGrantAuditService();

    await service.record(tx as never, {
      actorUserId: "admin-1",
      targetUserId: "member-1",
      role: "PROJECT_MANAGER",
      scope: "project",
      resourceId: "project-1",
      reason: "project_team_role_update",
      outcome: "GRANTED"
    });

    expect(tx.roleGrantAuditEvent.create).toHaveBeenCalledWith({
      data: {
        actorUserId: "admin-1",
        targetUserId: "member-1",
        role: "PROJECT_MANAGER",
        scope: "project",
        resourceId: "project-1",
        reason: "project_team_role_update",
        outcome: "GRANTED"
      }
    });
  });

  it("forwards extended audit fields when provided", async () => {
    const tx = {
      roleGrantAuditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-2" }) }
    };
    const service = new RoleGrantAuditService();

    await service.record(tx as never, {
      actorUserId: "admin-1",
      targetUserId: "member-1",
      role: "WORKSPACE_ADMIN",
      scope: "workspace",
      resourceId: "workspace-1",
      reason: "workspace_member_role_update",
      outcome: "GRANTED",
      tenantId: "tenant-1",
      policyVersion: "v1",
      priorRole: "WORKSPACE_MEMBER",
      requestId: "req-abc",
      decisionReason: "managed_role",
      actorType: "user",
      requestSource: "api"
    });

    expect(tx.roleGrantAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-1",
        policyVersion: "v1",
        priorRole: "WORKSPACE_MEMBER",
        requestId: "req-abc",
        decisionReason: "managed_role",
        actorType: "user",
        requestSource: "api"
      })
    });
  });

  it("omits undefined extended fields from the create payload", async () => {
    const tx = {
      roleGrantAuditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-3" }) }
    };
    const service = new RoleGrantAuditService();

    await service.record(tx as never, {
      actorUserId: "admin-1",
      targetUserId: "member-1",
      role: "WORKSPACE_MEMBER",
      scope: "workspace",
      resourceId: "workspace-1",
      reason: "invite",
      outcome: "GRANTED"
      // no extended fields
    });

    const callData = tx.roleGrantAuditEvent.create.mock.calls[0][0].data;
    expect(callData).not.toHaveProperty("tenantId");
    expect(callData).not.toHaveProperty("priorRole");
    expect(callData).not.toHaveProperty("requestId");
  });
});
