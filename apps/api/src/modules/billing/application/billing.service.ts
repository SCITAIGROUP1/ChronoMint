import { Injectable } from "@nestjs/common";
import type { CreateHourlyRateDto, ReportQueryDto } from "@chronomint/contracts";
import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  listRates(workspaceId: string) {
    return this.prisma.hourlyRate.findMany({
      where: { workspaceId },
      orderBy: { effectiveFrom: "desc" }
    }).then((rows) =>
      rows.map((r) => ({
        id: r.id,
        workspaceId: r.workspaceId,
        userId: r.userId,
        projectId: r.projectId,
        rate: r.rate.toNumber(),
        effectiveFrom: r.effectiveFrom.toISOString()
      }))
    );
  }

  createRate(workspaceId: string, dto: CreateHourlyRateDto) {
    return this.prisma.hourlyRate
      .create({
        data: {
          workspaceId,
          userId: dto.userId,
          projectId: dto.projectId,
          rate: dto.rate,
          effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date()
        }
      })
      .then((r) => ({
        id: r.id,
        workspaceId: r.workspaceId,
        userId: r.userId,
        projectId: r.projectId,
        rate: r.rate.toNumber(),
        effectiveFrom: r.effectiveFrom.toISOString()
      }));
  }

  async summary(workspaceId: string, query: ReportQueryDto) {
    const logs = await this.prisma.timeLog.findMany({
      where: {
        task: { project: { workspaceId } },
        startTime: { gte: new Date(query.from), lte: new Date(query.to) },
        ...(query.userId ? { userId: query.userId } : {}),
        ...(query.projectId ? { task: { projectId: query.projectId } } : {})
      },
      include: { user: true }
    });

    let totalHours = 0;
    let billableHours = 0;
    let totalAmount = 0;

    for (const log of logs) {
      const hours = log.durationSec / 3600;
      totalHours += hours;
      if (log.isBillable) {
        billableHours += hours;
        const rate =
          (await this.resolveRate(workspaceId, log.userId, log.taskId)) ??
          log.user.defaultHourlyRate?.toNumber() ??
          0;
        totalAmount += hours * rate;
      }
    }

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      billableHours: Math.round(billableHours * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      currency: "USD" as const
    };
  }

  private async resolveRate(workspaceId: string, userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    const projectRate = task
      ? await this.prisma.hourlyRate.findFirst({
          where: { workspaceId, projectId: task.projectId },
          orderBy: { effectiveFrom: "desc" }
        })
      : null;
    if (projectRate) return projectRate.rate.toNumber();
    const userRate = await this.prisma.hourlyRate.findFirst({
      where: { workspaceId, userId },
      orderBy: { effectiveFrom: "desc" }
    });
    return userRate?.rate.toNumber() ?? null;
  }
}
