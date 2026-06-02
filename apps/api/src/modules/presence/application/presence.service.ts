import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { RedisService } from "../../../common/redis/redis.service";

@Injectable()
export class PresenceService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService
  ) {}

  async snapshot(workspaceId: string) {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true }
    });

    const active: {
      userId: string;
      userName: string;
      taskId: string;
      taskName: string;
      projectName: string;
      startedAt: string;
    }[] = [];

    for (const m of members) {
      const raw = await this.redis.getClient().get(`timer:${workspaceId}:${m.userId}`);
      if (!raw) continue;
      const state = JSON.parse(raw) as { taskId: string; startedAt: string };
      const task = await this.prisma.task.findUnique({
        where: { id: state.taskId },
        include: { project: true }
      });
      if (!task) continue;
      active.push({
        userId: m.userId,
        userName: m.user.name,
        taskId: task.id,
        taskName: task.taskName,
        projectName: task.project.name,
        startedAt: state.startedAt
      });
    }

    return {
      members: active,
      updatedAt: new Date().toISOString()
    };
  }
}
