import type {
  RoleGrantAuditEventDto,
  RoleGrantAuditPage,
  RoleGrantAuditQuery
} from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class RoleGrantAuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async getTenantAuditLog(
    tenantId: string,
    query: RoleGrantAuditQuery
  ): Promise<RoleGrantAuditPage> {
    const { page, limit, scope, outcome, actorUserId, targetUserId, resourceId, from, to } = query;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(scope ? { scope } : {}),
      ...(outcome ? { outcome } : {}),
      ...(actorUserId ? { actorUserId } : {}),
      ...(targetUserId ? { targetUserId } : {}),
      ...(resourceId ? { resourceId } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {})
            }
          }
        : {})
    };

    const [events, total] = await Promise.all([
      this.prisma.roleGrantAuditEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      this.prisma.roleGrantAuditEvent.count({ where })
    ]);

    // Collect unique user IDs to resolve display names
    const userIds = [
      ...new Set([...events.map((e) => e.actorUserId), ...events.map((e) => e.targetUserId)])
    ];

    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true }
          })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Collect workspace IDs referenced in the event set to resolve display names
    const workspaceIds = events.filter((e) => e.scope === "workspace").map((e) => e.resourceId);
    const workspaces =
      workspaceIds.length > 0
        ? await this.prisma.workspace.findMany({
            where: { id: { in: workspaceIds } },
            select: { id: true, name: true }
          })
        : [];
    const workspaceMap = new Map(workspaces.map((w) => [w.id, w.name]));

    const data: RoleGrantAuditEventDto[] = events.map((e) => ({
      id: e.id,
      actorUserId: e.actorUserId,
      actorUserName: userMap.get(e.actorUserId)?.name,
      actorUserEmail: userMap.get(e.actorUserId)?.email,
      targetUserId: e.targetUserId,
      targetUserName: userMap.get(e.targetUserId)?.name,
      targetUserEmail: userMap.get(e.targetUserId)?.email,
      role: e.role,
      scope: e.scope,
      resourceId: e.resourceId,
      resourceName: e.scope === "workspace" ? workspaceMap.get(e.resourceId) : undefined,
      reason: e.reason,
      outcome: e.outcome as "GRANTED" | "REVOKED",
      tenantId: e.tenantId,
      policyVersion: e.policyVersion,
      priorRole: e.priorRole ?? undefined,
      requestId: e.requestId ?? undefined,
      decisionReason: e.decisionReason ?? undefined,
      actorType: e.actorType,
      requestSource: e.requestSource,
      createdAt: e.createdAt.toISOString()
    }));

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1
    };
  }
}
