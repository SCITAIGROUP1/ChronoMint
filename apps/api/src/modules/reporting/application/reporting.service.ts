import type { DashboardReportDto, MyWeekSummaryDto, ReportQueryDto } from "@chronomint/contracts";
import { Injectable } from "@nestjs/common";
import { ReportCacheService } from "../../../common/cache/report-cache.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { roundExport } from "../../../common/time/round.util";
import { TimeAggregationService } from "../../../common/time/time-aggregation.service";
import { getWeekStartDate, getWeekStartUtc } from "../../../common/time/week.util";

type HoursAgg = {
  totalHours: number;
  billableHours: number;
  billableAmount: number;
};

@Injectable()
export class ReportingService {
  constructor(
    private prisma: PrismaService,
    private aggregation: TimeAggregationService,
    private reportCache: ReportCacheService
  ) {}

  async myWeekSummary(workspaceId: string, userId: string): Promise<MyWeekSummaryDto> {
    const now = new Date();
    const weekStart = getWeekStartDate(now, "sunday");
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);

    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setUTCHours(23, 59, 59, 999);

    const weekLogs = await this.aggregation.fetchLogs(workspaceId, {
      from: weekStart,
      to: weekEnd,
      userId
    });

    const todayHours = roundExport(
      weekLogs
        .filter((l) => l.startTime >= todayStart && l.startTime <= todayEnd)
        .reduce((sum, l) => sum + l.durationSec / 3600, 0)
    );

    const { resolveRate } = await this.aggregation.resolveRateMaps(workspaceId);
    const weekAgg = this.aggregation.buildAggregates(weekLogs, resolveRate);

    const projectIds = [...weekAgg.byProject.keys()];
    const projectRows =
      projectIds.length > 0
        ? await this.prisma.project.findMany({
            where: { id: { in: projectIds } },
            select: { id: true, color: true }
          })
        : [];
    const colorByProjectId = new Map(projectRows.map((p) => [p.id, p.color]));

    let weekTotalHours = 0;
    let weekBillableHours = 0;
    const byProject = [...weekAgg.byProject.entries()]
      .map(([projectId, v]) => {
        weekTotalHours += v.totalHours;
        weekBillableHours += v.billableHours;
        return {
          projectId,
          projectName: v.projectName,
          projectColor: colorByProjectId.get(projectId) ?? "#6366f1",
          totalHours: roundExport(v.totalHours),
          billableHours: roundExport(v.billableHours)
        };
      })
      .sort((a, b) => b.totalHours - a.totalHours);

    return {
      weekStart: weekStart.toISOString().slice(0, 10),
      weekEnd: weekEnd.toISOString().slice(0, 10),
      todayHours,
      weekTotalHours: roundExport(weekTotalHours),
      weekBillableHours: roundExport(weekBillableHours),
      byProject
    };
  }

  async dashboard(workspaceId: string, query: ReportQueryDto): Promise<DashboardReportDto> {
    const cacheKey = this.reportCache.dashboardKey(
      workspaceId,
      query.from,
      query.to,
      query.userId,
      query.projectId
    );
    const cached = await this.reportCache.getDashboard(cacheKey);
    if (cached) return cached;

    const result = await this.buildDashboard(workspaceId, query);
    await this.reportCache.setDashboard(cacheKey, workspaceId, result);
    return result;
  }

  private async buildDashboard(
    workspaceId: string,
    query: ReportQueryDto
  ): Promise<DashboardReportDto> {
    const from = new Date(query.from);
    const to = new Date(query.to);

    const logs = await this.aggregation.fetchLogs(workspaceId, {
      from,
      to,
      userId: query.userId,
      projectId: query.projectId
    });
    const { resolveRate } = await this.aggregation.resolveRateMaps(workspaceId);
    const { workspaceAgg, byProject, byUser } = this.aggregation.buildAggregates(logs, resolveRate);

    const activeProjects = new Set(logs.map((l) => l.task.projectId));
    const activeMembers = new Set(logs.map((l) => l.userId));

    const weekly = new Map<string, HoursAgg>();
    const daily = new Map<string, HoursAgg>();

    for (const log of logs) {
      const hours = log.durationSec / 3600;
      const billable = log.isBillable;
      const amount = billable
        ? hours *
          resolveRate(
            log.userId,
            log.task.projectId,
            log.user.defaultHourlyRate?.toNumber() ?? null
          )
        : 0;

      const weekKey = getWeekStartUtc(log.startTime, "sunday");
      const weekEntry = weekly.get(weekKey) ?? {
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0
      };
      this.addHours(weekEntry, hours, billable, amount);
      weekly.set(weekKey, weekEntry);

      const dayKey = log.startTime.toISOString().slice(0, 10);
      const dayEntry = daily.get(dayKey) ?? {
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0
      };
      this.addHours(dayEntry, hours, billable, amount);
      daily.set(dayKey, dayEntry);
    }

    const wsTotal = workspaceAgg.totalHours;
    const billablePercent =
      wsTotal > 0 ? roundExport((workspaceAgg.billableHours / wsTotal) * 100) : 0;

    const topProjectIds = [...byProject.entries()]
      .sort((a, b) => b[1].totalHours - a[1].totalHours)
      .slice(0, 6)
      .map(([id]) => id);
    const topProjectSet = new Set(topProjectIds);

    const dailyProjectStacks = new Map<
      string,
      Map<string, { projectName: string; hours: number }>
    >();
    for (const log of logs) {
      const pid = log.task.projectId;
      if (!topProjectSet.has(pid)) continue;
      const dayKey = log.startTime.toISOString().slice(0, 10);
      const dayMap = dailyProjectStacks.get(dayKey) ?? new Map();
      const entry = dayMap.get(pid) ?? {
        projectName: log.task.project.name,
        hours: 0
      };
      entry.hours += log.durationSec / 3600;
      dayMap.set(pid, entry);
      dailyProjectStacks.set(dayKey, dayMap);
    }

    const dailyByProject = [...daily.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date]) => {
        const dayMap = dailyProjectStacks.get(date) ?? new Map();
        const stacks = topProjectIds
          .map((projectId) => {
            const v = dayMap.get(projectId);
            if (!v || v.hours <= 0) return null;
            return {
              projectId,
              projectName: v.projectName,
              hours: roundExport(v.hours)
            };
          })
          .filter((s): s is NonNullable<typeof s> => s !== null);
        return { date, stacks };
      });

    return {
      period: { from: query.from, to: query.to },
      workspace: {
        totalHours: roundExport(wsTotal),
        billableHours: roundExport(workspaceAgg.billableHours),
        nonBillableHours: roundExport(wsTotal - workspaceAgg.billableHours),
        totalAmount: roundExport(workspaceAgg.billableAmount),
        currency: "USD" as const,
        activeProjects: activeProjects.size,
        activeMembers: activeMembers.size,
        billablePercent
      },
      timeByProject: [...byProject.entries()]
        .map(([projectId, v]) => this.toBreakdown(projectId, v))
        .sort((a, b) => b.totalHours - a.totalHours),
      timeByUser: [...byUser.entries()]
        .map(([userId, v]) => ({
          userId,
          userName: v.userName,
          ...this.stripName(v)
        }))
        .sort((a, b) => b.totalHours - a.totalHours),
      weeklyHours: [...weekly.entries()]
        .map(([weekStart, v]) => ({
          weekStart,
          ...this.stripName(v)
        }))
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
      dailyHours: [...daily.entries()]
        .map(([date, v]) => ({
          date,
          ...this.stripName(v)
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      dailyByProject
    };
  }

  private addHours(agg: HoursAgg, hours: number, billable: boolean, amount: number) {
    agg.totalHours += hours;
    if (billable) {
      agg.billableHours += hours;
      agg.billableAmount += amount;
    }
  }

  private toBreakdown(projectId: string, v: HoursAgg & { projectName: string }) {
    return {
      projectId,
      projectName: v.projectName,
      totalHours: roundExport(v.totalHours),
      billableHours: roundExport(v.billableHours),
      nonBillableHours: roundExport(v.totalHours - v.billableHours),
      billableAmount: roundExport(v.billableAmount)
    };
  }

  private stripName(v: HoursAgg) {
    return {
      totalHours: roundExport(v.totalHours),
      billableHours: roundExport(v.billableHours),
      nonBillableHours: roundExport(v.totalHours - v.billableHours),
      billableAmount: roundExport(v.billableAmount)
    };
  }
}
