import { Injectable } from "@nestjs/common";
import type { CreateTaskDto, UpdateTaskDto } from "@chronomint/contracts";
import { ErrorCodes } from "@chronomint/contracts";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { DomainException } from "../../../common/errors/domain.exception";
import { HttpStatus } from "@nestjs/common";
import { ProjectAccessService } from "../../projects/application/project-access.service";

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private access: ProjectAccessService
  ) {}

  toDto(t: { id: string; projectId: string; taskName: string; billableDefault: boolean }) {
    return {
      id: t.id,
      projectId: t.projectId,
      taskName: t.taskName,
      billableDefault: t.billableDefault
    };
  }

  async list(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    projectId?: string
  ) {
    let projectIds = await this.access.accessibleProjectIds(workspaceId, userId, role);
    if (projectId) {
      if (!projectIds.includes(projectId)) return [];
      projectIds = [projectId];
    }
    if (projectIds.length === 0) return [];

    const tasks = await this.prisma.task.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { taskName: "asc" }
    });
    return tasks.map((t) => this.toDto(t));
  }

  async create(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    dto: CreateTaskDto
  ) {
    await this.access.assertCanAccessProject(workspaceId, userId, role, dto.projectId);
    const t = await this.prisma.task.create({
      data: {
        projectId: dto.projectId,
        taskName: dto.taskName,
        billableDefault: dto.billableDefault ?? true
      }
    });
    return this.toDto(t);
  }

  async update(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    id: string,
    dto: UpdateTaskDto
  ) {
    const task = await this.assertAccessibleTask(workspaceId, userId, role, id);
    const t = await this.prisma.task.update({
      where: { id: task.id },
      data: { taskName: dto.taskName, billableDefault: dto.billableDefault }
    });
    return this.toDto(t);
  }

  async remove(workspaceId: string, userId: string, role: "ADMIN" | "MEMBER", id: string) {
    const task = await this.assertAccessibleTask(workspaceId, userId, role, id);
    await this.prisma.task.delete({ where: { id: task.id } });
    return { ok: true };
  }

  private async assertAccessibleTask(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    taskId: string
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, project: { workspaceId } }
    });
    if (!task) throw new DomainException(ErrorCodes.NOT_FOUND, "Task not found", HttpStatus.NOT_FOUND);
    await this.access.assertCanAccessProject(workspaceId, userId, role, task.projectId);
    return task;
  }
}
