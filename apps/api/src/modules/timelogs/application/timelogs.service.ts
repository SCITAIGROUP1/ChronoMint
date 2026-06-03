import type {
  CreateTimeLogDto,
  UpdateTimeLogDto,
  ListTimeLogsQueryDto,
  ListTimeLogsResponseDto
} from "@chronomint/contracts";
import { ErrorCodes } from "@chronomint/contracts";
import { Injectable, HttpStatus } from "@nestjs/common";
import { ReportCacheService } from "../../../common/cache/report-cache.service";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";

const DEFAULT_LIST_LIMIT = 500;
const DEFAULT_LIST_LOOKBACK_DAYS = 90;

@Injectable()
export class TimelogsService {
  constructor(
    private prisma: PrismaService,
    private reportCache: ReportCacheService
  ) {}

  toDto(log: {
    id: string;
    userId: string;
    taskId: string;
    startTime: Date;
    endTime: Date;
    durationSec: number;
    description: string | null;
    isBillable: boolean;
    source: string;
  }) {
    return {
      id: log.id,
      userId: log.userId,
      taskId: log.taskId,
      startTime: log.startTime.toISOString(),
      endTime: log.endTime.toISOString(),
      durationSec: log.durationSec,
      description: log.description,
      isBillable: log.isBillable,
      source: log.source as "manual" | "timer"
    };
  }

  async list(
    workspaceId: string,
    userId: string,
    role: string,
    query: ListTimeLogsQueryDto
  ): Promise<ListTimeLogsResponseDto> {
    const filterUserId = role === "ADMIN" ? query.userId : userId;
    const limit = Math.min(query.limit ?? DEFAULT_LIST_LIMIT, 1000);

    let from = query.from ? new Date(query.from) : undefined;
    let to = query.to ? new Date(query.to) : undefined;
    if (!from && !to) {
      to = new Date();
      from = new Date(to);
      from.setDate(from.getDate() - DEFAULT_LIST_LOOKBACK_DAYS);
    }

    const logs = await this.prisma.timeLog.findMany({
      where: {
        ...(filterUserId ? { userId: filterUserId } : {}),
        ...(query.taskId ? { taskId: query.taskId } : {}),
        ...(from || to
          ? {
              AND: [
                ...(to ? [{ startTime: { lt: to } }] : []),
                ...(from ? [{ endTime: { gt: from } }] : [])
              ]
            }
          : {}),
        task: { project: { workspaceId } }
      },
      orderBy: { startTime: "desc" },
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {})
    });

    const hasMore = logs.length > limit;
    const page = hasMore ? logs.slice(0, limit) : logs;

    return {
      items: page.map((l) => this.toDto(l)),
      nextCursor: hasMore ? page[page.length - 1]!.id : undefined
    };
  }

  async create(workspaceId: string, userId: string, dto: CreateTimeLogDto) {
    await this.assertTaskInWorkspace(workspaceId, dto.taskId);
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    await this.assertNoOverlap(userId, start, end);
    const task = await this.prisma.task.findUniqueOrThrow({ where: { id: dto.taskId } });
    const log = await this.prisma.timeLog.create({
      data: {
        userId,
        taskId: dto.taskId,
        startTime: start,
        endTime: end,
        durationSec: Math.floor((end.getTime() - start.getTime()) / 1000),
        description: dto.description,
        isBillable: dto.isBillable ?? task.billableDefault,
        source: "manual"
      }
    });
    await this.reportCache.invalidateWorkspace(workspaceId);
    return this.toDto(log);
  }

  async update(
    workspaceId: string,
    userId: string,
    role: string,
    id: string,
    dto: UpdateTimeLogDto
  ) {
    const log = await this.prisma.timeLog.findFirst({
      where: { id, task: { project: { workspaceId } } }
    });
    if (!log)
      throw new DomainException(ErrorCodes.NOT_FOUND, "TimeLog not found", HttpStatus.NOT_FOUND);
    if (role !== "ADMIN" && log.userId !== userId) {
      throw new DomainException(ErrorCodes.FORBIDDEN, "Not your entry", HttpStatus.FORBIDDEN);
    }
    if (dto.taskId) await this.assertTaskInWorkspace(workspaceId, dto.taskId);
    const start = dto.startTime ? new Date(dto.startTime) : log.startTime;
    const end = dto.endTime ? new Date(dto.endTime) : log.endTime;
    await this.assertNoOverlap(log.userId, start, end, id);
    const updated = await this.prisma.timeLog.update({
      where: { id },
      data: {
        ...(dto.taskId !== undefined ? { taskId: dto.taskId } : {}),
        startTime: start,
        endTime: end,
        durationSec: Math.floor((end.getTime() - start.getTime()) / 1000),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isBillable !== undefined ? { isBillable: dto.isBillable } : {})
      }
    });
    await this.reportCache.invalidateWorkspace(workspaceId);
    return this.toDto(updated);
  }

  async remove(workspaceId: string, userId: string, role: string, id: string) {
    const log = await this.prisma.timeLog.findFirst({
      where: { id, task: { project: { workspaceId } } }
    });
    if (!log)
      throw new DomainException(ErrorCodes.NOT_FOUND, "TimeLog not found", HttpStatus.NOT_FOUND);
    if (role !== "ADMIN" && log.userId !== userId) {
      throw new DomainException(ErrorCodes.FORBIDDEN, "Not your entry", HttpStatus.FORBIDDEN);
    }
    await this.prisma.timeLog.delete({ where: { id } });
    await this.reportCache.invalidateWorkspace(workspaceId);
    return { ok: true };
  }

  private async assertTaskInWorkspace(workspaceId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, project: { workspaceId } }
    });
    if (!task)
      throw new DomainException(ErrorCodes.NOT_FOUND, "Task not found", HttpStatus.NOT_FOUND);
  }

  private async assertNoOverlap(userId: string, start: Date, end: Date, excludeId?: string) {
    const overlap = await this.prisma.timeLog.findFirst({
      where: {
        userId,
        id: excludeId ? { not: excludeId } : undefined,
        startTime: { lt: end },
        endTime: { gt: start }
      }
    });
    if (overlap) {
      throw new DomainException(
        ErrorCodes.TIMELOG_OVERLAP,
        "Overlapping time entry",
        HttpStatus.CONFLICT
      );
    }
  }
}
