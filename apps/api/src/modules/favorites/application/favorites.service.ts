import {
  ErrorCodes,
  MAX_FAVORITE_PROJECTS,
  MAX_FAVORITE_TASKS,
  type EntryFavoritesResponse,
  type ImportEntryFavoritesDto
} from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import {
  ProjectAccessService,
  type WorkspaceRole
} from "../../../common/access/project-access.service";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class FavoritesService {
  constructor(
    private prisma: PrismaService,
    private access: ProjectAccessService
  ) {}

  async list(userId: string, workspaceId: string): Promise<EntryFavoritesResponse> {
    const [projectRows, taskRows] = await Promise.all([
      this.prisma.userFavoriteProject.findMany({
        where: { userId, workspaceId },
        orderBy: { createdAt: "asc" },
        select: { projectId: true }
      }),
      this.prisma.userFavoriteTask.findMany({
        where: { userId, workspaceId },
        orderBy: { createdAt: "asc" },
        select: {
          taskId: true,
          task: {
            select: {
              projectId: true,
              taskName: true,
              project: { select: { name: true, color: true } }
            }
          }
        }
      })
    ]);

    return {
      projects: projectRows.map((row) => row.projectId),
      tasks: taskRows.map((row) => ({
        projectId: row.task.projectId,
        taskId: row.taskId,
        projectName: row.task.project.name,
        taskName: row.task.taskName,
        projectColor: row.task.project.color
      }))
    };
  }

  async addProject(
    userId: string,
    workspaceId: string,
    role: WorkspaceRole,
    projectId: string
  ): Promise<EntryFavoritesResponse> {
    await this.access.assertCanAccessProject(workspaceId, userId, role, projectId);

    const existing = await this.prisma.userFavoriteProject.findUnique({
      where: { userId_projectId: { userId, projectId } }
    });
    if (!existing) {
      await this.enforceProjectCap(userId, workspaceId);
      await this.prisma.userFavoriteProject.create({
        data: { userId, workspaceId, projectId }
      });
    }
    return this.list(userId, workspaceId);
  }

  async removeProject(
    userId: string,
    workspaceId: string,
    projectId: string
  ): Promise<EntryFavoritesResponse> {
    await this.prisma.userFavoriteProject.deleteMany({
      where: { userId, workspaceId, projectId }
    });
    return this.list(userId, workspaceId);
  }

  async addTask(
    userId: string,
    workspaceId: string,
    role: WorkspaceRole,
    taskId: string
  ): Promise<EntryFavoritesResponse> {
    await this.access.assertCanLogTask(workspaceId, userId, role, taskId);

    const existing = await this.prisma.userFavoriteTask.findUnique({
      where: { userId_taskId: { userId, taskId } }
    });
    if (!existing) {
      await this.enforceTaskCap(userId, workspaceId);
      await this.prisma.userFavoriteTask.create({
        data: { userId, workspaceId, taskId }
      });
    }
    return this.list(userId, workspaceId);
  }

  async removeTask(
    userId: string,
    workspaceId: string,
    taskId: string
  ): Promise<EntryFavoritesResponse> {
    await this.prisma.userFavoriteTask.deleteMany({
      where: { userId, workspaceId, taskId }
    });
    return this.list(userId, workspaceId);
  }

  /**
   * One-shot merge of localStorage favorites into the server store.
   * Skips inaccessible entities; respects FIFO caps.
   */
  async importLocal(
    userId: string,
    workspaceId: string,
    role: WorkspaceRole,
    dto: ImportEntryFavoritesDto
  ): Promise<EntryFavoritesResponse> {
    for (const projectId of dto.projects) {
      try {
        await this.addProject(userId, workspaceId, role, projectId);
      } catch (error) {
        if (!(error instanceof DomainException)) throw error;
        if (error.code !== ErrorCodes.FORBIDDEN && error.code !== ErrorCodes.NOT_FOUND) {
          throw error;
        }
      }
    }
    for (const item of dto.tasks) {
      try {
        await this.addTask(userId, workspaceId, role, item.taskId);
      } catch (error) {
        if (!(error instanceof DomainException)) throw error;
        if (
          error.code !== ErrorCodes.FORBIDDEN &&
          error.code !== ErrorCodes.NOT_FOUND &&
          error.code !== ErrorCodes.ENTITY_INACTIVE
        ) {
          throw error;
        }
      }
    }
    return this.list(userId, workspaceId);
  }

  private async enforceProjectCap(userId: string, workspaceId: string): Promise<void> {
    const count = await this.prisma.userFavoriteProject.count({
      where: { userId, workspaceId }
    });
    if (count < MAX_FAVORITE_PROJECTS) return;
    const oldest = await this.prisma.userFavoriteProject.findFirst({
      where: { userId, workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true }
    });
    if (oldest) {
      await this.prisma.userFavoriteProject.delete({ where: { id: oldest.id } });
    }
  }

  private async enforceTaskCap(userId: string, workspaceId: string): Promise<void> {
    const count = await this.prisma.userFavoriteTask.count({
      where: { userId, workspaceId }
    });
    if (count < MAX_FAVORITE_TASKS) return;
    const oldest = await this.prisma.userFavoriteTask.findFirst({
      where: { userId, workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true }
    });
    if (oldest) {
      await this.prisma.userFavoriteTask.delete({ where: { id: oldest.id } });
    }
  }

  /** Used when a path param is missing / invalid before service work. */
  assertUuid(id: string, label: string): void {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        `Invalid ${label}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }
}
