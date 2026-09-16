import type { ExportBillableFilter } from "@kloqra/contracts";
import { TIME_LOG_CLASSIFICATION_LABELS, isNonProjectClassification } from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import { isClientCommercialFeaturesEnabled } from "../commercial/client-commercial-features.util";
import { composeTimeLogScopeWhere } from "../non-project/non-project-scope";
import { PrismaService } from "../prisma/prisma.service";

export type TimeLogWithRelations = Awaited<ReturnType<TimeAggregationService["fetchLogs"]>>[number];

export type ExportFilters = {
  from: Date;
  to: Date;
  projectId?: string | string[];
  projectIds?: string[];
  userId?: string | string[];
  userIds?: string[];
  categoryId?: string | string[];
  taskId?: string;
  billable?: ExportBillableFilter;
  nonProjectTime?: "include" | "exclude" | "only";
  classifications?: string[];
};

const UNCATEGORIZED_LABEL = "Uncategorized";

function normalizeIdList(value?: string | string[]): string[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return [...new Set(list.filter(Boolean))];
}

function categoryMeta(log: {
  task: {
    categoryId: string;
    category: { id: string; name: string } | null;
  } | null;
  classification?: string | null;
}) {
  if (!log.task) {
    const classification =
      log.classification && isNonProjectClassification(log.classification)
        ? log.classification
        : "TENANT_ACTIVITY";
    return {
      categoryId: classification,
      categoryName: TIME_LOG_CLASSIFICATION_LABELS[classification]
    };
  }
  return {
    categoryId: log.task.category?.id ?? log.task.categoryId,
    categoryName: log.task.category?.name ?? UNCATEGORIZED_LABEL
  };
}

export type TimeLogWithTask = TimeLogWithRelations & {
  task: NonNullable<TimeLogWithRelations["task"]>;
};

export function resolveLogTaskView(log: TimeLogWithRelations) {
  if (log.task) {
    return {
      taskId: log.taskId,
      taskName: log.task.taskName || "General Work",
      categoryId: log.task.category?.id ?? log.task.categoryId,
      categoryName: log.task.category?.name ?? UNCATEGORIZED_LABEL,
      projectId: log.task.projectId,
      projectName: log.task.project.name,
      clientName: log.task.project.clientName
    };
  }
  const classification = isNonProjectClassification(log.classification)
    ? log.classification
    : "TENANT_ACTIVITY";
  const label =
    log.activityType?.name ?? log.holiday?.name ?? TIME_LOG_CLASSIFICATION_LABELS[classification];
  return {
    taskId: log.taskId,
    taskName: label,
    categoryId: classification,
    categoryName: TIME_LOG_CLASSIFICATION_LABELS[classification],
    projectId: "__non_project__",
    projectName: label,
    clientName: null as string | null
  };
}

type HoursAgg = {
  totalHours: number;
  billableHours: number;
  billableAmount: number;
};

@Injectable()
export class TimeAggregationService {
  constructor(private prisma: PrismaService) {}

  async fetchLogs(workspaceId: string, filters: ExportFilters) {
    const billableWhere =
      filters.billable === "billable"
        ? { isBillable: true }
        : filters.billable === "non_billable"
          ? { isBillable: false }
          : {};

    let userWhere = {};
    const uIds: string[] = [];
    if (filters.userId) {
      if (Array.isArray(filters.userId)) {
        uIds.push(...filters.userId);
      } else {
        uIds.push(filters.userId);
      }
    }
    if (filters.userIds) {
      uIds.push(...filters.userIds);
    }
    if (uIds.length > 0) {
      const uniqueUIds = [...new Set(uIds)].filter(Boolean);
      if (uniqueUIds.length === 1) {
        userWhere = { userId: uniqueUIds[0] };
      } else {
        userWhere = { userId: { in: uniqueUIds } };
      }
    }

    const projectWhere: { workspaceId: string; id?: string | { in: string[] } } = { workspaceId };
    const pIds: string[] = [];
    if (filters.projectId) {
      if (Array.isArray(filters.projectId)) {
        pIds.push(...filters.projectId);
      } else {
        pIds.push(filters.projectId);
      }
    }
    if (filters.projectIds) {
      pIds.push(...filters.projectIds);
    }
    if (pIds.length > 0) {
      const uniquePIds = [...new Set(pIds)].filter(Boolean);
      projectWhere.id = uniquePIds.length === 1 ? uniquePIds[0] : { in: uniquePIds };
    }

    const categoryIds = normalizeIdList(filters.categoryId);
    const categoryWhere =
      categoryIds.length === 0
        ? {}
        : categoryIds.length === 1
          ? { categoryId: categoryIds[0] }
          : { categoryId: { in: categoryIds } };

    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { tenantId: true }
    });
    const hasProjectFilters = Boolean(filters.taskId || pIds.length > 0 || categoryIds.length > 0);
    const projectLogsWhere = {
      ...(filters.taskId ? { taskId: filters.taskId } : {}),
      task: {
        ...categoryWhere,
        project: projectWhere
      }
    };
    const scopeWhere = composeTimeLogScopeWhere({
      workspaceId,
      tenantId: workspace.tenantId,
      nonProjectTime: filters.nonProjectTime,
      hasProjectFilters,
      projectLogsWhere
    });

    return this.prisma.timeLog.findMany({
      where: {
        ...(filters.classifications?.length
          ? { classification: { in: filters.classifications } }
          : {}),
        ...scopeWhere,
        startTime: { gte: filters.from, lte: filters.to },
        ...billableWhere,
        ...userWhere
      },
      select: {
        id: true,
        userId: true,
        taskId: true,
        classification: true,
        startTime: true,
        endTime: true,
        durationSec: true,
        description: true,
        isBillable: true,
        source: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            defaultHourlyRate: true
          }
        },
        activityType: { select: { name: true } },
        holiday: { select: { name: true } },
        task: {
          select: {
            id: true,
            taskName: true,
            projectId: true,
            categoryId: true,
            category: { select: { id: true, name: true } },
            project: {
              select: {
                id: true,
                name: true,
                clientName: true
              }
            }
          }
        }
      },
      orderBy: { startTime: "asc" }
    });
  }

  async resolveRateMaps(workspaceId: string) {
    // Perf: skip HourlyRate query entirely when commercial features are off (UAT).
    if (!isClientCommercialFeaturesEnabled()) {
      return {
        resolveRate: () => 0
      };
    }

    const rates = await this.prisma.hourlyRate.findMany({
      where: { workspaceId },
      orderBy: { effectiveFrom: "desc" }
    });

    rates.sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());

    const projectRatesMap = new Map<string, typeof rates>();
    const userRatesMap = new Map<string, typeof rates>();

    for (const r of rates) {
      if (r.projectId) {
        const list = projectRatesMap.get(r.projectId) ?? [];
        list.push(r);
        projectRatesMap.set(r.projectId, list);
      }
      if (r.userId) {
        const list = userRatesMap.get(r.userId) ?? [];
        list.push(r);
        userRatesMap.set(r.userId, list);
      }
    }

    const resolveRate = (
      userId: string,
      projectId: string,
      defaultRate: number | null,
      dateInput?: Date | string | null
    ) => {
      const date = dateInput ? new Date(dateInput) : new Date();

      const pRates = projectRatesMap.get(projectId);
      if (pRates) {
        const match = pRates.find((r) => r.effectiveFrom <= date);
        if (match) return match.rate.toNumber();
      }

      const uRates = userRatesMap.get(userId);
      if (uRates) {
        const match = uRates.find((r) => r.effectiveFrom <= date);
        if (match) return match.rate.toNumber();
      }

      return defaultRate ?? 0;
    };

    return { resolveRate };
  }

  async teamMemberUserIds(projectId: string): Promise<string[]> {
    const team = await this.prisma.team.findUnique({
      where: { projectId },
      include: { members: true }
    });
    return team?.members.filter((m) => m.isActive).map((m) => m.userId) ?? [];
  }

  async teamMembersUserIds(projectIds: string[]): Promise<string[]> {
    if (projectIds.length === 0) return [];
    const teams = await this.prisma.team.findMany({
      where: { projectId: { in: projectIds } },
      include: { members: true }
    });
    return [
      ...new Set(teams.flatMap((t) => t.members.filter((m) => m.isActive).map((m) => m.userId)))
    ];
  }

  buildAggregates(
    logs: TimeLogWithRelations[],
    resolveRate: (
      userId: string,
      projectId: string,
      defaultRate: number | null,
      date?: Date | string | null
    ) => number
  ) {
    const byProject = new Map<
      string,
      HoursAgg & { projectName: string; clientName: string | null; members: Set<string> }
    >();
    const byUser = new Map<string, HoursAgg & { userName: string; userEmail: string }>();
    const byCategory = new Map<string, HoursAgg & { categoryName: string; tasks: Set<string> }>();
    const daily = new Map<
      string,
      Map<
        string,
        HoursAgg & {
          userName: string;
          userEmail: string;
          projectName: string;
          clientName: string | null;
        }
      >
    >();

    const workspaceAgg: HoursAgg = {
      totalHours: 0,
      billableHours: 0,
      billableAmount: 0
    };

    for (const log of logs) {
      const hours = log.durationSec / 3600;
      const billable = log.isBillable;
      const projectId = log.task?.projectId ?? "__non_project__";
      const projectName =
        log.task?.project.name ??
        (isNonProjectClassification(log.classification)
          ? TIME_LOG_CLASSIFICATION_LABELS[log.classification]
          : "Organization time");
      const clientName = log.task?.project.clientName ?? null;
      const amount = billable
        ? hours *
          resolveRate(
            log.userId,
            log.task?.projectId ?? "",
            log.user.defaultHourlyRate?.toNumber() ?? null,
            log.startTime
          )
        : 0;

      this.addHours(workspaceAgg, hours, billable, amount);

      const pid = projectId;
      const pEntry = byProject.get(pid) ?? {
        projectName,
        clientName,
        members: new Set<string>(),
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0
      };
      pEntry.members.add(log.userId);
      this.addHours(pEntry, hours, billable, amount);
      byProject.set(pid, pEntry);

      const uEntry = byUser.get(log.userId) ?? {
        userName: log.user.name,
        userEmail: log.user.email,
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0
      };
      this.addHours(uEntry, hours, billable, amount);
      byUser.set(log.userId, uEntry);

      const { categoryId, categoryName } = categoryMeta(log);
      const cEntry = byCategory.get(categoryId) ?? {
        categoryName,
        tasks: new Set<string>(),
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0
      };
      cEntry.tasks.add(log.taskId ?? categoryId);
      this.addHours(cEntry, hours, billable, amount);
      byCategory.set(categoryId, cEntry);

      const dayKey = log.startTime.toISOString().slice(0, 10);
      const dayMap = daily.get(dayKey) ?? new Map();
      const rowKey = `${log.userId}:${pid}`;
      const dEntry = dayMap.get(rowKey) ?? {
        userName: log.user.name,
        userEmail: log.user.email,
        projectName,
        clientName,
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0
      };
      this.addHours(dEntry, hours, billable, amount);
      dayMap.set(rowKey, dEntry);
      daily.set(dayKey, dayMap);
    }

    return { workspaceAgg, byProject, byUser, byCategory, daily };
  }

  private addHours(agg: HoursAgg, hours: number, billable: boolean, amount: number) {
    agg.totalHours += hours;
    if (billable) {
      agg.billableHours += hours;
      agg.billableAmount += amount;
    }
  }
}
