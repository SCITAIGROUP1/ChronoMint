import type { SetUserMappingDto } from "@kloqra/contracts";
import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { JiraApiService } from "./jira-api.service";

@Injectable()
export class JiraUsersService {
  constructor(
    private prisma: PrismaService,
    private api: JiraApiService
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

  async listJiraUsers(workspaceId: string) {
    return this.api.getUsers(workspaceId);
  }

  async getMappings(workspaceId: string) {
    const conn = await this.getConnection(workspaceId);

    const [mappings, issueGroups, projectMappings] = await Promise.all([
      this.prisma.jiraUserMapping.findMany({
        where: { connectionId: conn.id },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { jiraDisplayName: "asc" }
      }),
      this.prisma.jiraIssueCache.groupBy({
        by: ["assigneeId", "jiraProjectId"],
        where: { connectionId: conn.id, assigneeId: { not: null } }
      }),
      this.prisma.jiraProjectMapping.findMany({
        where: { connectionId: conn.id },
        select: { jiraProjectId: true, jiraProjectName: true, jiraProjectKey: true }
      })
    ]);

    const projectMap = new Map(
      projectMappings.map((p) => [
        p.jiraProjectId,
        { name: p.jiraProjectName, key: p.jiraProjectKey }
      ])
    );

    const userProjectsMap = new Map<string, Array<{ name: string; key: string }>>();
    for (const item of issueGroups) {
      if (!item.assigneeId) continue;
      const project = projectMap.get(item.jiraProjectId);
      if (!project) continue;
      if (!userProjectsMap.has(item.assigneeId)) userProjectsMap.set(item.assigneeId, []);
      userProjectsMap.get(item.assigneeId)!.push(project);
    }

    return mappings.map((m) => ({
      id: m.id,
      jiraAccountId: m.jiraAccountId,
      jiraEmail: m.jiraEmail,
      jiraDisplayName: m.jiraDisplayName,
      userId: m.userId,
      userName: m.user?.name ?? null,
      userEmail: m.user?.email ?? null,
      projects: userProjectsMap.get(m.jiraAccountId) ?? [],
      isBench: (userProjectsMap.get(m.jiraAccountId) ?? []).length === 0
    }));
  }

  async getMyMapping(workspaceId: string, userId: string) {
    const mapping = await this.prisma.jiraUserMapping.findFirst({
      where: { workspaceId, userId }
    });
    return mapping
      ? {
          jiraAccountId: mapping.jiraAccountId,
          jiraDisplayName: mapping.jiraDisplayName,
          jiraEmail: mapping.jiraEmail
        }
      : null;
  }

  async setMyMappingByEmail(workspaceId: string, userId: string, jiraEmail: string) {
    const conn = await this.getConnection(workspaceId);

    const jiraUsers = await this.api.getUsers(workspaceId);
    const jiraUser = jiraUsers.find(
      (u) => u.emailAddress?.toLowerCase() === jiraEmail.toLowerCase()
    );

    if (!jiraUser) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "This email was not found in your Jira workspace",
        HttpStatus.NOT_FOUND
      );
    }

    const mapping = await this.prisma.jiraUserMapping.upsert({
      where: {
        connectionId_jiraAccountId: { connectionId: conn.id, jiraAccountId: jiraUser.accountId }
      },
      create: {
        connectionId: conn.id,
        workspaceId,
        jiraAccountId: jiraUser.accountId,
        jiraEmail: jiraUser.emailAddress,
        jiraDisplayName: jiraUser.displayName,
        userId,
        autoMatched: false
      },
      update: {
        userId,
        jiraEmail: jiraUser.emailAddress,
        jiraDisplayName: jiraUser.displayName,
        autoMatched: false
      }
    });

    return {
      jiraAccountId: mapping.jiraAccountId,
      jiraDisplayName: mapping.jiraDisplayName,
      jiraEmail: mapping.jiraEmail
    };
  }

  async autoMap(workspaceId: string): Promise<{ matched: number }> {
    const conn = await this.getConnection(workspaceId);
    const jiraUsers = await this.api.getUsers(workspaceId);

    const workspaceMembers = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, email: true } } }
    });

    const emailToUserId = new Map(
      workspaceMembers.map((m) => [m.user.email.toLowerCase(), m.user.id])
    );

    let matched = 0;

    for (const jiraUser of jiraUsers) {
      if (!jiraUser.emailAddress) continue;
      const userId = emailToUserId.get(jiraUser.emailAddress.toLowerCase());

      await this.prisma.jiraUserMapping.upsert({
        where: {
          connectionId_jiraAccountId: { connectionId: conn.id, jiraAccountId: jiraUser.accountId }
        },
        create: {
          connectionId: conn.id,
          workspaceId,
          jiraAccountId: jiraUser.accountId,
          jiraEmail: jiraUser.emailAddress,
          jiraDisplayName: jiraUser.displayName,
          userId: userId ?? null,
          autoMatched: !!userId
        },
        update: {
          jiraEmail: jiraUser.emailAddress,
          jiraDisplayName: jiraUser.displayName,
          ...(userId ? { userId, autoMatched: true } : {})
        }
      });

      if (userId) matched++;
    }

    return { matched };
  }

  async setMapping(workspaceId: string, dto: SetUserMappingDto) {
    const conn = await this.getConnection(workspaceId);

    const existing = await this.prisma.jiraUserMapping.findFirst({
      where: { connectionId: conn.id, jiraAccountId: dto.jiraAccountId }
    });

    if (!existing) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Jira user not found in mappings",
        HttpStatus.NOT_FOUND
      );
    }

    return this.prisma.jiraUserMapping.update({
      where: { id: existing.id },
      data: { userId: dto.userId, autoMatched: false }
    });
  }
}
