import type { ListSyncLogsQuery } from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class JiraSyncLogService {
  constructor(private prisma: PrismaService) {}

  async log(
    connectionId: string,
    operation: string,
    entityType: string,
    entityId: string | null,
    status: "SUCCESS" | "FAILED" | "PARTIAL",
    message?: string,
    metadata: Record<string, unknown> = {}
  ) {
    return this.prisma.jiraSyncLog.create({
      data: {
        connectionId,
        operation,
        entityType,
        entityId,
        status,
        message,
        metadata: metadata as Prisma.InputJsonValue
      }
    });
  }

  async list(workspaceId: string, query: ListSyncLogsQuery) {
    const conn = await this.prisma.jiraConnection.findUnique({ where: { workspaceId } });
    if (!conn) return { items: [], page: query.page, limit: query.limit, total: 0, totalPages: 0 };

    const where = {
      connectionId: conn.id,
      ...(query.status ? { status: query.status } : {})
    };

    const [total, rows] = await Promise.all([
      this.prisma.jiraSyncLog.count({ where }),
      this.prisma.jiraSyncLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      })
    ]);

    return {
      items: rows,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    };
  }

  async cleanup(olderThanDays = 30) {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const result = await this.prisma.jiraSyncLog.deleteMany({
      where: { createdAt: { lt: cutoff } }
    });
    return { deleted: result.count };
  }
}
