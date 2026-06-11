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

    const mappings = await this.prisma.jiraUserMapping.findMany({
      where: { connectionId: conn.id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { jiraDisplayName: "asc" }
    });

    return mappings.map((m) => ({
      id: m.id,
      jiraAccountId: m.jiraAccountId,
      jiraEmail: m.jiraEmail,
      jiraDisplayName: m.jiraDisplayName,
      userId: m.userId,
      userName: m.user?.name ?? null,
      autoMatched: m.autoMatched
    }));
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
