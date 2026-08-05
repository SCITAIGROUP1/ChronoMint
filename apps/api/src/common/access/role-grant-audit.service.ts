import type { ManagedRole, ResourceScope } from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

export type RoleGrantAuditInput = {
  actorUserId: string;
  targetUserId: string;
  role: ManagedRole;
  scope: ResourceScope;
  resourceId: string;
  reason: string;
  outcome: "GRANTED" | "REVOKED";
  // Extended fields — all optional so existing call sites remain valid
  tenantId?: string;
  policyVersion?: string;
  priorRole?: string;
  requestId?: string;
  decisionReason?: string;
  actorType?: "user" | "system" | "worker" | "platform_staff";
  requestSource?: "api" | "worker" | "webhook" | "migration";
};

@Injectable()
export class RoleGrantAuditService {
  async record(tx: Prisma.TransactionClient, input: RoleGrantAuditInput): Promise<void> {
    await tx.roleGrantAuditEvent.create({
      data: {
        actorUserId: input.actorUserId,
        targetUserId: input.targetUserId,
        role: input.role,
        scope: input.scope,
        resourceId: input.resourceId,
        reason: input.reason,
        outcome: input.outcome,
        ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
        ...(input.policyVersion !== undefined ? { policyVersion: input.policyVersion } : {}),
        ...(input.priorRole !== undefined ? { priorRole: input.priorRole } : {}),
        ...(input.requestId !== undefined ? { requestId: input.requestId } : {}),
        ...(input.decisionReason !== undefined ? { decisionReason: input.decisionReason } : {}),
        ...(input.actorType !== undefined ? { actorType: input.actorType } : {}),
        ...(input.requestSource !== undefined ? { requestSource: input.requestSource } : {})
      }
    });
  }
}
