import type { TimeLogDto } from "@kloqra/contracts";
import {
  localMidnightUtcInZone,
  logStartDateKey,
  resolveLogDurationSec,
  toDateKeyInZone
} from "@kloqra/web-shared";

export type DashboardTask = {
  id: string;
  projectId: string;
  taskName: string;
  categoryId?: string | null;
  categoryName?: string | null;
  billableDefault?: boolean;
};

export type DashboardProject = {
  id: string;
  name: string;
  clientName?: string | null;
  color?: string | null;
};

export type DistributionRow = {
  id: string;
  name: string;
  clientName?: string | null;
  hours: number;
  percentage: number;
  color: string;
};

const PALETTE = [
  "hsl(221 83% 53%)",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(280 67% 58%)",
  "hsl(0 84% 60%)",
  "hsl(187 85% 43%)"
];

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function distribution(
  values: Map<string, { name: string; clientName?: string | null; seconds: number; color?: string }>
) {
  const totalSeconds = [...values.values()].reduce((sum, item) => sum + item.seconds, 0);
  const rows: DistributionRow[] = [...values.entries()]
    .map(([id, item], index) => ({
      id,
      name: item.name,
      clientName: item.clientName,
      hours: round(item.seconds / 3600),
      percentage: totalSeconds ? Math.round((item.seconds / totalSeconds) * 1000) / 10 : 0,
      color: item.color ?? PALETTE[index % PALETTE.length]!
    }))
    .sort((a, b) => b.hours - a.hours);
  return { rows, totalHours: round(totalSeconds / 3600) };
}

export function buildCategorySplitData(logs: TimeLogDto[], tasks: DashboardTask[]) {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const values = new Map<string, { name: string; seconds: number }>();
  for (const log of logs) {
    const task = taskById.get(log.taskId);
    const id = task?.categoryId ?? "uncategorized";
    const current = values.get(id) ?? {
      name: task?.categoryName ?? "Uncategorized",
      seconds: 0
    };
    current.seconds += resolveLogDurationSec(log);
    values.set(id, current);
  }
  return distribution(values);
}

export function buildProjectSplitData(
  logs: TimeLogDto[],
  projects: DashboardProject[],
  tasks: DashboardTask[]
) {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const values = new Map<
    string,
    { name: string; clientName?: string | null; seconds: number; color?: string }
  >();
  for (const log of logs) {
    const projectId = taskById.get(log.taskId)?.projectId ?? "unknown";
    const project = projectById.get(projectId);
    const current = values.get(projectId) ?? {
      name: project?.name ?? "No Project",
      clientName: project?.clientName,
      color: project?.color ?? undefined,
      seconds: 0
    };
    current.seconds += resolveLogDurationSec(log);
    values.set(projectId, current);
  }
  return distribution(values);
}

export function buildWeeklyProgressData(
  logs: TimeLogDto[],
  startDate: string,
  endDate: string,
  timezone: string
) {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const start = localMidnightUtcInZone(sy!, sm!, sd!, timezone);
  const end = localMidnightUtcInZone(ey!, em!, ed!, timezone);
  const days: Date[] = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    days.push(new Date(cursor));
  }
  return days.map((day) => {
    const key = toDateKeyInZone(day, timezone);
    let billable = 0;
    let nonBillable = 0;
    for (const log of logs) {
      if (logStartDateKey(log, timezone) !== key) continue;
      const hours = resolveLogDurationSec(log) / 3600;
      if (log.isBillable) billable += hours;
      else nonBillable += hours;
    }
    return {
      date: key,
      label: day.toLocaleDateString(undefined, {
        ...(days.length > 7 ? { month: "short", day: "numeric" } : { weekday: "short" }),
        timeZone: timezone
      }),
      billable: round(billable),
      nonBillable: round(nonBillable)
    };
  });
}
