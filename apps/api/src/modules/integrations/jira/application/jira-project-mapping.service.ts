import type { JiraProjectMappingDto, UpsertJiraProjectMappingsDto } from "@kloqra/contracts";
import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainException } from "../../../../common/errors/domain.exception";
import { integrationPrisma } from "../../../../common/prisma/integration-prisma";
import { PrismaService } from "../../../../common/prisma/prisma.service";

@Injectable()
export class JiraProjectMappingService {
  constructor(private prisma: PrismaService) {}

  async list(workspaceId: string): Promise<JiraProjectMappingDto[]> {
    const rows = await integrationPrisma(this.prisma).jiraProjectMapping.findMany({
      where: { workspaceId },
      include: { project: { select: { name: true } } },
      orderBy: { jiraProjectKey: "asc" }
    });
    return rows.map((row) => this.toDto(row));
  }

  async upsertMany(
    workspaceId: string,
    dto: UpsertJiraProjectMappingsDto
  ): Promise<JiraProjectMappingDto[]> {
    for (const mapping of dto.mappings) {
      await this.assertProjectInWorkspace(workspaceId, mapping.chronomintProjectId);
      await this.assertCategoryInWorkspace(workspaceId, mapping.defaultCategoryId);
    }

    const db = integrationPrisma(this.prisma);
    for (const mapping of dto.mappings) {
      await db.jiraProjectMapping.upsert({
        where: {
          workspaceId_jiraProjectKey: {
            workspaceId,
            jiraProjectKey: mapping.jiraProjectKey
          }
        },
        create: {
          workspaceId,
          jiraProjectKey: mapping.jiraProjectKey,
          chronomintProjectId: mapping.chronomintProjectId,
          autoCreateTasks: mapping.autoCreateTasks ?? true,
          defaultCategoryId: mapping.defaultCategoryId
        },
        update: {
          chronomintProjectId: mapping.chronomintProjectId,
          autoCreateTasks: mapping.autoCreateTasks ?? true,
          defaultCategoryId: mapping.defaultCategoryId
        }
      });
    }

    return this.list(workspaceId);
  }

  private toDto(row: {
    id: string;
    jiraProjectKey: string;
    chronomintProjectId: string;
    autoCreateTasks: boolean;
    defaultCategoryId: string;
    project?: { name: string } | null;
  }): JiraProjectMappingDto {
    return {
      id: row.id,
      jiraProjectKey: row.jiraProjectKey,
      chronomintProjectId: row.chronomintProjectId,
      chronomintProjectName: row.project?.name,
      autoCreateTasks: row.autoCreateTasks,
      defaultCategoryId: row.defaultCategoryId
    };
  }

  private async assertProjectInWorkspace(workspaceId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true }
    });
    if (!project) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Project not found", HttpStatus.NOT_FOUND);
    }
  }

  private async assertCategoryInWorkspace(workspaceId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, workspaceId },
      select: { id: true }
    });
    if (!category) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Category not found in this workspace",
        HttpStatus.BAD_REQUEST
      );
    }
  }
}
