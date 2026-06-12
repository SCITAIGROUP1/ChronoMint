import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { JiraApiService } from "./jira-api.service";
import { JiraSyncLogService } from "./jira-sync-log.service";

@Injectable()
export class JiraWorklogsService {
  constructor(
    private prisma: PrismaService,
    private api: JiraApiService,
    private syncLog: JiraSyncLogService
  ) {}

  private async getConnection(workspaceId: string) {
    const conn = await this.prisma.jiraConnection.findUnique({ where: { workspaceId } });
    if (!conn) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Jira is not connected",
        HttpStatus.NOT_FOUND
      );
    }
    return conn;
  }

  async listSyncStatus(workspaceId: string, page = 1, limit = 25) {
    const conn = await this.getConnection(workspaceId);

    const [total, rows] = await Promise.all([
      this.prisma.jiraWorklogSync.count({ where: { connectionId: conn.id } }),
      this.prisma.jiraWorklogSync.findMany({
        where: { connectionId: conn.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          timeLog: { select: { startTime: true, durationSec: true, description: true } }
        }
      })
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        timeLogId: r.timeLogId,
        jiraIssueKey: r.jiraIssueKey,
        jiraWorklogId: r.jiraWorklogId,
        status: r.status,
        errorMessage: r.errorMessage,
        syncedAt: r.syncedAt,
        createdAt: r.createdAt,
        timeLog: r.timeLog
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  async syncOne(workspaceId: string, worklogSyncId: string): Promise<{ ok: boolean }> {
    const conn = await this.getConnection(workspaceId);

    const entry = await this.prisma.jiraWorklogSync.findFirst({
      where: { id: worklogSyncId, connectionId: conn.id },
      include: { timeLog: true }
    });

    if (!entry) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Worklog sync entry not found",
        HttpStatus.NOT_FOUND
      );
    }

    return this.pushWorklog(workspaceId, conn.id, entry);
  }

  async syncPending(workspaceId: string): Promise<{ pushed: number; failed: number }> {
    const conn = await this.getConnection(workspaceId);

    const pending = await this.prisma.jiraWorklogSync.findMany({
      where: { connectionId: conn.id, status: { in: ["PENDING", "FAILED"] } },
      include: { timeLog: true },
      take: 100
    });

    let pushed = 0;
    let failed = 0;

    for (const entry of pending) {
      const result = await this.pushWorklog(workspaceId, conn.id, entry);
      if (result.ok) pushed++;
      else failed++;
    }

    return { pushed, failed };
  }

  private async pushWorklog(
    workspaceId: string,
    connectionId: string,
    entry: {
      id: string;
      jiraIssueKey: string;
      timeLog: { startTime: Date; durationSec: number; description?: string | null };
    }
  ): Promise<{ ok: boolean }> {
    try {
      const worklog = await this.api.addWorklog(
        workspaceId,
        entry.jiraIssueKey,
        entry.timeLog.durationSec,
        entry.timeLog.startTime,
        entry.timeLog.description ?? undefined
      );

      await this.prisma.jiraWorklogSync.update({
        where: { id: entry.id },
        data: {
          status: "SYNCED",
          jiraWorklogId: worklog.id,
          syncedAt: new Date(),
          errorMessage: null
        }
      });

      await this.syncLog.log(
        connectionId,
        "PUSH_WORKLOG",
        "TIMELOG",
        entry.id,
        "SUCCESS",
        `Pushed worklog to ${entry.jiraIssueKey}`
      );

      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      await this.prisma.jiraWorklogSync.update({
        where: { id: entry.id },
        data: { status: "FAILED", errorMessage: msg }
      });

      await this.syncLog.log(connectionId, "PUSH_WORKLOG", "TIMELOG", entry.id, "FAILED", msg);

      return { ok: false };
    }
  }
}
