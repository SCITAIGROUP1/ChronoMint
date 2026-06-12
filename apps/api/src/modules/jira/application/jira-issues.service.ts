import type { ListIssuesQuery } from "@kloqra/contracts";
import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainException } from "../../../common/errors/domain.exception";
import { paginationSkipTake, toPaginatedResponse } from "../../../common/http/pagination.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import type { JiraApiIssue } from "./jira-api.service";
import { JiraApiService } from "./jira-api.service";
import { JiraSyncLogService } from "./jira-sync-log.service";

@Injectable()
export class JiraIssuesService {
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

  private parseIssue(issue: JiraApiIssue) {
    const sprint = issue.fields.customfield_10020?.[0];
    return {
      jiraIssueId: issue.id,
      jiraIssueKey: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status.name,
      issueType: issue.fields.issuetype.name,
      priority: issue.fields.priority?.name ?? null,
      assigneeId: issue.fields.assignee?.accountId ?? null,
      storyPoints: issue.fields.customfield_10016 ?? null,
      sprintId: sprint ? String(sprint.id) : null,
      sprintName: sprint?.name ?? null,
      labels: issue.fields.labels ?? [],
      dueDate: issue.fields.duedate ? new Date(issue.fields.duedate) : null
    };
  }

  async syncIssues(workspaceId: string, projectKey?: string): Promise<{ synced: number }> {
    const conn = await this.getConnection(workspaceId);

    const mappings = await this.prisma.jiraProjectMapping.findMany({
      where: {
        connectionId: conn.id,
        syncEnabled: true,
        ...(projectKey ? { jiraProjectKey: projectKey } : {})
      }
    });

    let total = 0;

    for (const mapping of mappings) {
      try {
        let nextPageToken: string | undefined = undefined;
        const maxResults = 100;

        while (true) {
          const data = await this.api.getIssues(workspaceId, {
            projectKey: mapping.jiraProjectKey,
            nextPageToken,
            maxResults
          });

          for (const issue of data.issues) {
            const parsed = this.parseIssue(issue);
            await this.prisma.jiraIssueCache.upsert({
              where: {
                connectionId_jiraIssueId: {
                  connectionId: conn.id,
                  jiraIssueId: issue.id
                }
              },
              create: {
                connectionId: conn.id,
                jiraProjectId: mapping.jiraProjectId,
                ...parsed,
                cachedAt: new Date()
              },
              update: {
                jiraProjectId: mapping.jiraProjectId,
                ...parsed,
                cachedAt: new Date()
              }
            });
            total++;
          }

          if (!data.nextPageToken || data.issues.length === 0) break;
          nextPageToken = data.nextPageToken;
        }

        await this.prisma.jiraProjectMapping.update({
          where: { id: mapping.id },
          data: { lastSyncAt: new Date() }
        });

        await this.syncLog.log(
          conn.id,
          "SYNC_ISSUES",
          "PROJECT",
          mapping.jiraProjectId,
          "SUCCESS",
          `Synced issues for ${mapping.jiraProjectKey}`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await this.syncLog.log(
          conn.id,
          "SYNC_ISSUES",
          "PROJECT",
          mapping.jiraProjectId,
          "FAILED",
          msg
        );
      }
    }

    await this.prisma.jiraConnection.update({
      where: { id: conn.id },
      data: { lastSyncAt: new Date() }
    });

    return { synced: total };
  }

  async listCachedIssues(workspaceId: string, query: ListIssuesQuery) {
    const conn = await this.getConnection(workspaceId);

    const [projectMappings, userMappings] = await Promise.all([
      this.prisma.jiraProjectMapping.findMany({
        where: { connectionId: conn.id },
        select: { jiraProjectId: true, jiraProjectName: true, jiraProjectKey: true }
      }),
      this.prisma.jiraUserMapping.findMany({
        where: { connectionId: conn.id },
        select: { jiraAccountId: true, jiraDisplayName: true }
      })
    ]);
    const projectMap = new Map(
      projectMappings.map((p) => [
        p.jiraProjectId,
        { name: p.jiraProjectName, key: p.jiraProjectKey }
      ])
    );
    const userMap = new Map(userMappings.map((u) => [u.jiraAccountId, u.jiraDisplayName]));

    const where = {
      connectionId: conn.id,
      ...(query.projectKey
        ? { jiraProjectId: { in: await this.getProjectIds(conn.id, query.projectKey) } }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.sprintId ? { sprintId: query.sprintId } : {}),
      ...(query.search
        ? {
            OR: [
              { summary: { contains: query.search, mode: "insensitive" as const } },
              { jiraIssueKey: { contains: query.search, mode: "insensitive" as const } }
            ]
          }
        : {})
    };

    const [total, rows] = await Promise.all([
      this.prisma.jiraIssueCache.count({ where }),
      this.prisma.jiraIssueCache.findMany({
        where,
        orderBy: [{ jiraProjectId: "asc" }, { jiraIssueKey: "asc" }],
        ...paginationSkipTake(query.page, query.limit)
      })
    ]);

    const enriched = rows.map((row) => ({
      ...row,
      projectName: projectMap.get(row.jiraProjectId)?.name ?? null,
      projectKey: projectMap.get(row.jiraProjectId)?.key ?? null,
      assigneeName: row.assigneeId ? (userMap.get(row.assigneeId) ?? null) : null
    }));

    return toPaginatedResponse(enriched, total, query.page, query.limit);
  }

  async getMyIssues(workspaceId: string, userId: string) {
    const conn = await this.getConnection(workspaceId);

    const [userMapping, projectMappings] = await Promise.all([
      this.prisma.jiraUserMapping.findFirst({ where: { connectionId: conn.id, userId } }),
      this.prisma.jiraProjectMapping.findMany({
        where: { connectionId: conn.id },
        include: { chronoProject: { select: { name: true } } }
      })
    ]);

    if (!userMapping) return [];

    const projectNameMap = new Map(
      projectMappings.map((m) => [m.jiraProjectId, m.chronoProject?.name ?? m.jiraProjectName])
    );

    const data = await this.api.getIssues(workspaceId, {
      assigneeAccountId: userMapping.jiraAccountId,
      maxResults: 100
    });

    return data.issues.map((issue) => ({
      ...this.parseIssue(issue),
      projectKey: issue.fields.project?.key ?? null,
      projectName:
        projectNameMap.get(issue.fields.project?.id ?? "") ?? issue.fields.project?.name ?? null,
      jiraUrl: `${conn.siteUrl}/browse/${issue.key}`
    }));
  }

  private async getProjectIds(connectionId: string, projectKey: string): Promise<string[]> {
    const mappings = await this.prisma.jiraProjectMapping.findMany({
      where: { connectionId, jiraProjectKey: projectKey },
      select: { jiraProjectId: true }
    });
    return mappings.map((m) => m.jiraProjectId);
  }
}
