import { Injectable } from "@nestjs/common";
import {
  DEFAULT_EXPECTED_WEEKLY_HOURS,
  parseWorkspaceSettings,
  type ExportBodyDto,
  type ExportFiltersDto,
  type ExportReportType
} from "@chronomint/contracts";
import { PrismaService } from "../../../common/prisma/prisma.service";
import {
  roundExport,
  TimeAggregationService,
  type TimeLogWithRelations
} from "../../reporting/application/time-aggregation.service";
import { daysInRange, formatWeekLabel, getWeekStartUtc } from "./export-week.util";

export type ExportRowContext = {
  workspaceId: string;
  workspaceName: string;
  filters: ExportFiltersDto;
  from: Date;
  to: Date;
  logs: TimeLogWithRelations[];
  aggregates: ReturnType<TimeAggregationService["buildAggregates"]>;
  resolveRate: (userId: string, projectId: string, defaultRate: number | null) => number;
};

@Injectable()
export class ExportRowsBuilder {
  constructor(
    private prisma: PrismaService,
    private aggregation: TimeAggregationService
  ) {}

  async buildRows(
    report: ExportReportType,
    ctx: ExportRowContext
  ): Promise<Record<string, string | number>[]> {
    switch (report) {
      case "time_entries":
        return this.buildTimeEntries(ctx);
      case "invoice":
        return this.buildInvoice(ctx);
      case "daily_summary":
        return this.buildDailySummary(ctx);
      case "weekly_summary":
        return await this.buildWeeklySummary(ctx);
      case "by_project":
        return this.buildByProject(ctx);
      case "by_member":
        return this.buildByMember(ctx);
      case "by_task":
        return this.buildByTask(ctx);
      case "users_without_time":
        return await this.buildUsersWithoutTime(ctx);
      case "budget_vs_actual":
        return await this.buildBudgetVsActual(ctx);
      case "utilization":
        return await this.buildUtilization(ctx);
      default:
        return [];
    }
  }

  private buildTimeEntries(ctx: ExportRowContext): Record<string, string | number>[] {
    return ctx.logs.map((l) => this.logToTimeEntryRow(l, ctx.workspaceName, ctx.resolveRate));
  }

  private buildInvoice(ctx: ExportRowContext): Record<string, string | number>[] {
    const billableLogs = ctx.logs.filter((l) => l.isBillable);
    const rows = billableLogs.map((l) => {
      const hours = roundExport(l.durationSec / 3600);
      const rate = roundExport(
        ctx.resolveRate(
          l.userId,
          l.task.projectId,
          l.user.defaultHourlyRate?.toNumber() ?? null
        )
      );
      return {
        client: l.task.project.clientName ?? "",
        project: l.task.project.name,
        task: l.task.taskName,
        date: l.startTime.toISOString().slice(0, 10),
        hours,
        rate,
        amount: roundExport(hours * rate),
        description: l.description ?? ""
      };
    });
    const subtotal = rows.reduce((s, r) => s + Number(r.amount), 0);
    rows.push({
      client: "",
      project: "",
      task: "",
      date: "",
      hours: 0,
      rate: 0,
      amount: roundExport(subtotal),
      description: "TOTAL"
    });
    return rows;
  }

  private logToTimeEntryRow(
    l: TimeLogWithRelations,
    workspaceName: string,
    resolveRate: ExportRowContext["resolveRate"]
  ): Record<string, string | number> {
    const hours = roundExport(l.durationSec / 3600);
    const rate = roundExport(
      resolveRate(l.userId, l.task.projectId, l.user.defaultHourlyRate?.toNumber() ?? null)
    );
    const amount = l.isBillable ? roundExport(hours * rate) : 0;
    return {
      workspace: workspaceName,
      client: l.task.project.clientName ?? "",
      project: l.task.project.name,
      task: l.task.taskName,
      member: l.user.name,
      email: l.user.email,
      date: l.startTime.toISOString().slice(0, 10),
      start_time: l.startTime.toISOString(),
      end_time: l.endTime.toISOString(),
      hours,
      billable: l.isBillable ? "yes" : "no",
      rate,
      amount,
      description: l.description ?? "",
      source: l.source
    };
  }

  private buildDailySummary(ctx: ExportRowContext): Record<string, string | number>[] {
    const rows: Record<string, string | number>[] = [];
    for (const [date, dayMap] of ctx.aggregates.daily) {
      for (const [, v] of dayMap) {
        rows.push({
          date,
          member: v.userName,
          email: v.userEmail,
          client: v.clientName ?? "",
          project: v.projectName,
          total_hours: roundExport(v.totalHours),
          billable_hours: roundExport(v.billableHours),
          non_billable_hours: roundExport(v.totalHours - v.billableHours),
          billable_amount: roundExport(v.billableAmount)
        });
      }
    }
    return rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  private async buildWeeklySummary(
    ctx: ExportRowContext
  ): Promise<Record<string, string | number>[]> {
    const settings = await this.loadSettings(ctx.workspaceId);
    const weekStartPref = settings.weekStart ?? "monday";
    const weekly = new Map<
      string,
      {
        userName: string;
        userEmail: string;
        projectName: string;
        clientName: string | null;
        totalHours: number;
        billableHours: number;
        billableAmount: number;
      }
    >();

    for (const log of ctx.logs) {
      const weekStart = getWeekStartUtc(log.startTime, weekStartPref);
      const key = `${weekStart}:${log.userId}:${log.task.projectId}`;
      const entry = weekly.get(key) ?? {
        userName: log.user.name,
        userEmail: log.user.email,
        projectName: log.task.project.name,
        clientName: log.task.project.clientName,
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0
      };
      const hours = log.durationSec / 3600;
      entry.totalHours += hours;
      if (log.isBillable) {
        entry.billableHours += hours;
        entry.billableAmount +=
          hours *
          ctx.resolveRate(
            log.userId,
            log.task.projectId,
            log.user.defaultHourlyRate?.toNumber() ?? null
          );
      }
      weekly.set(key, entry);
    }

    return [...weekly.entries()]
      .map(([key, v]) => {
        const weekStart = key.split(":")[0]!;
        return {
          week_start: weekStart,
          week_label: formatWeekLabel(weekStart),
          member: v.userName,
          email: v.userEmail,
          client: v.clientName ?? "",
          project: v.projectName,
          total_hours: roundExport(v.totalHours),
          billable_hours: roundExport(v.billableHours),
          non_billable_hours: roundExport(v.totalHours - v.billableHours),
          billable_amount: roundExport(v.billableAmount)
        };
      })
      .sort((a, b) => String(a.week_start).localeCompare(String(b.week_start)));
  }

  private buildByProject(ctx: ExportRowContext): Record<string, string | number>[] {
    return [...ctx.aggregates.byProject.entries()]
      .map(([, v]) => ({
        project: v.projectName,
        client: v.clientName ?? "",
        total_hours: roundExport(v.totalHours),
        billable_hours: roundExport(v.billableHours),
        non_billable_hours: roundExport(v.totalHours - v.billableHours),
        billable_amount: roundExport(v.billableAmount),
        active_members: v.members.size
      }))
      .sort((a, b) => Number(b.total_hours) - Number(a.total_hours));
  }

  private buildByMember(ctx: ExportRowContext): Record<string, string | number>[] {
    return [...ctx.aggregates.byUser.entries()]
      .map(([, v]) => ({
        member: v.userName,
        email: v.userEmail,
        total_hours: roundExport(v.totalHours),
        billable_hours: roundExport(v.billableHours),
        non_billable_hours: roundExport(v.totalHours - v.billableHours),
        billable_amount: roundExport(v.billableAmount)
      }))
      .sort((a, b) => Number(b.total_hours) - Number(a.total_hours));
  }

  private buildByTask(ctx: ExportRowContext): Record<string, string | number>[] {
    const byTask = new Map<
      string,
      {
        taskName: string;
        projectName: string;
        clientName: string | null;
        totalHours: number;
        billableHours: number;
        billableAmount: number;
      }
    >();

    for (const log of ctx.logs) {
      const key = log.taskId;
      const entry = byTask.get(key) ?? {
        taskName: log.task.taskName,
        projectName: log.task.project.name,
        clientName: log.task.project.clientName,
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0
      };
      const hours = log.durationSec / 3600;
      entry.totalHours += hours;
      if (log.isBillable) {
        entry.billableHours += hours;
        entry.billableAmount +=
          hours *
          ctx.resolveRate(
            log.userId,
            log.task.projectId,
            log.user.defaultHourlyRate?.toNumber() ?? null
          );
      }
      byTask.set(key, entry);
    }

    return [...byTask.values()]
      .map((v) => ({
        task: v.taskName,
        project: v.projectName,
        client: v.clientName ?? "",
        total_hours: roundExport(v.totalHours),
        billable_hours: roundExport(v.billableHours),
        non_billable_hours: roundExport(v.totalHours - v.billableHours),
        billable_amount: roundExport(v.billableAmount)
      }))
      .sort((a, b) => Number(b.total_hours) - Number(a.total_hours));
  }

  private async buildUsersWithoutTime(
    ctx: ExportRowContext
  ): Promise<Record<string, string | number>[]> {
    const rangeDays = daysInRange(ctx.from, ctx.to);
    let memberUserIds: string[] | undefined;

    if (ctx.filters.projectId) {
      memberUserIds = await this.aggregation.teamMemberUserIds(ctx.filters.projectId);
    }

    const members = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        ...(memberUserIds?.length ? { userId: { in: memberUserIds } } : {}),
        ...(ctx.filters.userId ? { userId: ctx.filters.userId } : {})
      },
      include: { user: true }
    });

    const loggedUserIds = new Set(ctx.logs.map((l) => l.userId));
    const rows: Record<string, string | number>[] = [];

    for (const m of members) {
      if (loggedUserIds.has(m.userId)) continue;

      const lastLog = await this.prisma.timeLog.findFirst({
        where: {
          userId: m.userId,
          task: { project: { workspaceId: ctx.workspaceId } }
        },
        orderBy: { startTime: "desc" }
      });

      rows.push({
        member: m.user.name,
        email: m.user.email,
        last_log_date: lastLog ? lastLog.startTime.toISOString().slice(0, 10) : "",
        days_without_logs: rangeDays
      });
    }

    return rows.sort((a, b) => String(a.member).localeCompare(String(b.member)));
  }

  private async buildBudgetVsActual(
    ctx: ExportRowContext
  ): Promise<Record<string, string | number>[]> {
    const projects = await this.prisma.project.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        isActive: true,
        ...(ctx.filters.projectId ? { id: ctx.filters.projectId } : {})
      }
    });

    return projects
      .map((p) => {
        const agg = ctx.aggregates.byProject.get(p.id);
        const logged = agg?.totalHours ?? 0;
        const budget = p.budgetHours?.toNumber() ?? null;
        const remaining =
          budget !== null ? roundExport(Math.max(0, budget - logged)) : "";
        const percentUsed =
          budget !== null && budget > 0 ? roundExport((logged / budget) * 100) : "";
        return {
          project: p.name,
          client: p.clientName ?? "",
          budget_hours: budget !== null ? roundExport(budget) : "",
          logged_hours: roundExport(logged),
          remaining_hours: remaining,
          percent_used: percentUsed,
          billable_amount: roundExport(agg?.billableAmount ?? 0)
        };
      })
      .sort((a, b) => Number(b.logged_hours) - Number(a.logged_hours));
  }

  private async buildUtilization(ctx: ExportRowContext): Promise<Record<string, string | number>[]> {
    const settings = await this.loadSettings(ctx.workspaceId);
    const weekStartPref = settings.weekStart ?? "monday";
    const expectedWeekly =
      settings.expectedWeeklyHours ?? DEFAULT_EXPECTED_WEEKLY_HOURS;

    const byMemberWeek = new Map<
      string,
      { userName: string; userEmail: string; loggedHours: number }
    >();

    for (const log of ctx.logs) {
      const weekStart = getWeekStartUtc(log.startTime, weekStartPref);
      const key = `${weekStart}:${log.userId}`;
      const entry = byMemberWeek.get(key) ?? {
        userName: log.user.name,
        userEmail: log.user.email,
        loggedHours: 0
      };
      entry.loggedHours += log.durationSec / 3600;
      byMemberWeek.set(key, entry);
    }

    return [...byMemberWeek.entries()]
      .map(([key, v]) => {
        const weekStart = key.split(":")[0]!;
        const logged = roundExport(v.loggedHours);
        const util =
          expectedWeekly > 0 ? roundExport((v.loggedHours / expectedWeekly) * 100) : 0;
        return {
          week_start: weekStart,
          week_label: formatWeekLabel(weekStart),
          member: v.userName,
          email: v.userEmail,
          logged_hours: logged,
          expected_hours: expectedWeekly,
          utilization_pct: util
        };
      })
      .sort((a, b) => String(a.week_start).localeCompare(String(b.week_start)));
  }

  private async loadSettings(workspaceId: string) {
    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { settings: true }
    });
    return parseWorkspaceSettings(ws.settings);
  }
}
