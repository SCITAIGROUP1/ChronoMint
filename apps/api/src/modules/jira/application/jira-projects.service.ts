import type { UpsertProjectMappingDto } from "@kloqra/contracts";
import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { JiraApiService } from "./jira-api.service";

@Injectable()
export class JiraProjectsService {
  constructor(
    private prisma: PrismaService,
    private api: JiraApiService
  ) {}

  private async getConnection(workspaceId: string) {
    const conn = await this.prisma.jiraConnection.findUnique({ where: { workspaceId } });
    if (!conn) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Jira is not connected for this workspace",
        HttpStatus.NOT_FOUND
      );
    }
    return conn;
  }

  async listJiraProjects(workspaceId: string) {
    const projects = await this.api.getProjects(workspaceId);
    const conn = await this.getConnection(workspaceId);

    const mappings = await this.prisma.jiraProjectMapping.findMany({
      where: { connectionId: conn.id }
    });
    const mappedIds = new Set(mappings.map((m) => m.jiraProjectId));

    return projects.map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      projectTypeKey: p.projectTypeKey,
      avatarUrl: p.avatarUrls?.["48x48"],
      isMapped: mappedIds.has(p.id)
    }));
  }

  async getMappings(workspaceId: string) {
    const conn = await this.getConnection(workspaceId);
    const mappings = await this.prisma.jiraProjectMapping.findMany({
      where: { connectionId: conn.id },
      include: { chronoProject: { select: { id: true, name: true, color: true } } },
      orderBy: { jiraProjectName: "asc" }
    });

    return mappings.map((m) => ({
      id: m.id,
      connectionId: m.connectionId,
      jiraProjectId: m.jiraProjectId,
      jiraProjectKey: m.jiraProjectKey,
      jiraProjectName: m.jiraProjectName,
      chronoProjectId: m.chronoProjectId,
      chronoProject: m.chronoProject ?? null,
      syncEnabled: m.syncEnabled,
      syncDirection: m.syncDirection,
      lastSyncAt: m.lastSyncAt
    }));
  }

  async upsertMapping(workspaceId: string, dto: UpsertProjectMappingDto) {
    const conn = await this.getConnection(workspaceId);

    return this.prisma.jiraProjectMapping.upsert({
      where: {
        connectionId_jiraProjectId: { connectionId: conn.id, jiraProjectId: dto.jiraProjectId }
      },
      create: {
        connectionId: conn.id,
        jiraProjectId: dto.jiraProjectId,
        jiraProjectKey: dto.jiraProjectKey,
        jiraProjectName: dto.jiraProjectName,
        chronoProjectId: dto.chronoProjectId,
        syncEnabled: dto.syncEnabled ?? true,
        syncDirection: dto.syncDirection ?? "JIRA_TO_CHRONO"
      },
      update: {
        jiraProjectKey: dto.jiraProjectKey,
        jiraProjectName: dto.jiraProjectName,
        chronoProjectId: dto.chronoProjectId,
        syncEnabled: dto.syncEnabled ?? true,
        syncDirection: dto.syncDirection ?? "JIRA_TO_CHRONO"
      }
    });
  }

  async deleteMapping(workspaceId: string, mappingId: string) {
    const conn = await this.getConnection(workspaceId);
    const mapping = await this.prisma.jiraProjectMapping.findFirst({
      where: { id: mappingId, connectionId: conn.id }
    });
    if (!mapping) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Mapping not found", HttpStatus.NOT_FOUND);
    }
    await this.prisma.jiraProjectMapping.delete({ where: { id: mappingId } });
    return { ok: true };
  }
}
