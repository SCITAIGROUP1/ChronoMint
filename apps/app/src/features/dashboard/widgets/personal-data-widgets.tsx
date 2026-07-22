"use client";

import type { TimeLogDto } from "@kloqra/contracts";
import { Button, ProjectColorDot } from "@kloqra/ui";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@kloqra/ui/chart";
import { logStartDateKey, todayInZone, toDateKeyInZone } from "@kloqra/web-shared";
import { Clock, Lock, Play, Trash2 } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
  YAxis
} from "recharts";
import {
  buildCategorySplitData,
  buildProjectSplitData,
  buildWeeklyProgressData,
  type DashboardProject,
  type DashboardTask,
  type DistributionRow
} from "./personal-widget-data";

function DistributionWidget({
  rows,
  totalHours,
  emptyLabel
}: {
  rows: DistributionRow[];
  totalHours: number;
  emptyLabel: string;
}) {
  if (!rows.length) {
    return (
      <div className="flex h-full min-h-48 items-center justify-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }
  const config = Object.fromEntries(
    rows.map((row, index) => [`item_${index}`, { label: row.name, color: row.color }])
  ) satisfies ChartConfig;
  const chartRows = rows.map((row, index) => ({
    ...row,
    value: row.hours,
    fill: row.color,
    configKey: `item_${index}`
  }));
  return (
    <div className="grid h-full min-h-52 min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(180px,1fr)_minmax(160px,0.8fr)]">
      <div className="relative min-h-48 min-w-0">
        <ChartContainer config={config} className="h-full min-h-48 w-full">
          <PieChart accessibilityLayer>
            <ChartTooltip content={<ChartTooltipContent nameKey="configKey" />} />
            <Pie
              data={chartRows}
              dataKey="value"
              nameKey="configKey"
              innerRadius={54}
              outerRadius={82}
            >
              {chartRows.map((row) => (
                <Cell key={row.id} fill={row.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold">{totalHours.toFixed(2)}h</span>
          <span className="text-[10px] text-muted-foreground">Total</span>
        </div>
      </div>
      <div className="min-w-0 space-y-2 overflow-auto py-2">
        {rows.map((row) => (
          <div key={row.id} className="flex min-w-0 items-center gap-2 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{row.name}</p>
              {row.clientName ? (
                <p className="truncate text-[10px] text-muted-foreground">{row.clientName}</p>
              ) : null}
            </div>
            <span className="shrink-0 font-mono">{row.hours.toFixed(2)}h</span>
            <span className="w-10 shrink-0 text-right text-muted-foreground">
              {row.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CategorySplitWidget({
  logs,
  tasks
}: {
  logs: TimeLogDto[];
  tasks: DashboardTask[];
}) {
  const data = useMemo(() => buildCategorySplitData(logs, tasks), [logs, tasks]);
  return (
    <DistributionWidget
      rows={data.rows}
      totalHours={data.totalHours}
      emptyLabel="No time logged in this period."
    />
  );
}

export function ProjectSplitWidget({
  logs,
  projects,
  tasks
}: {
  logs: TimeLogDto[];
  projects: DashboardProject[];
  tasks: DashboardTask[];
}) {
  const data = useMemo(() => buildProjectSplitData(logs, projects, tasks), [logs, projects, tasks]);
  return (
    <DistributionWidget
      rows={data.rows}
      totalHours={data.totalHours}
      emptyLabel="No project time logged in this period."
    />
  );
}

const weeklyConfig = {
  billable: { label: "Billable", color: "var(--chart-1)" },
  nonBillable: { label: "Non-billable", color: "var(--chart-2)" }
} satisfies ChartConfig;

export function WeeklyProgressWidget({
  logs,
  startDate,
  endDate,
  timezone
}: {
  logs: TimeLogDto[];
  startDate: string;
  endDate: string;
  timezone: string;
}) {
  const rows = useMemo(
    () => buildWeeklyProgressData(logs, startDate, endDate, timezone),
    [logs, startDate, endDate, timezone]
  );
  return (
    <ChartContainer config={weeklyConfig} className="h-full min-h-52 w-full min-w-0">
      <BarChart data={rows} accessibilityLayer margin={{ left: -20, bottom: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        <ReferenceLine y={8} stroke="var(--destructive)" strokeDasharray="4 4" />
        <Bar dataKey="billable" stackId="day" fill="var(--color-billable)" />
        <Bar
          dataKey="nonBillable"
          stackId="day"
          fill="var(--color-nonBillable)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}

export function TodayLogsWidget({
  logs,
  projects,
  tasks,
  timezone,
  isLocked,
  onDelete,
  onRestart
}: {
  logs: TimeLogDto[];
  projects: DashboardProject[];
  tasks: DashboardTask[];
  timezone: string;
  isLocked: (log: TimeLogDto) => boolean;
  onDelete: (id: string) => Promise<void>;
  onRestart: (taskId: string) => Promise<void>;
}) {
  const todayLogs = useMemo(() => {
    const key = toDateKeyInZone(todayInZone(timezone), timezone);
    return logs
      .filter((log) => logStartDateKey(log, timezone) === key)
      .sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime));
  }, [logs, timezone]);
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const projectById = new Map(projects.map((project) => [project.id, project]));

  if (!todayLogs.length) {
    return (
      <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <Clock className="size-8 opacity-50" />
        No time tracked yet today.
      </div>
    );
  }
  return (
    <div className="flex min-h-48 flex-col gap-2 overflow-auto">
      {todayLogs.map((log) => {
        const task = taskById.get(log.taskId);
        const project = task ? projectById.get(task.projectId) : undefined;
        const locked = isLocked(log);
        return (
          <div
            key={log.id}
            className="flex min-w-0 flex-col gap-2 rounded-lg border border-border/60 p-3 text-xs sm:flex-row sm:items-center"
          >
            <ProjectColorDot color={project?.color ?? "var(--muted)"} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold">{project?.name ?? "No Project"}</span>
                <span className="text-muted-foreground">{task?.taskName ?? "Other"}</span>
                {task?.categoryName ? (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px]">
                    {task.categoryName}
                  </span>
                ) : null}
                {locked ? (
                  <Lock className="size-3 text-muted-foreground" aria-label="Locked" />
                ) : null}
              </div>
              {log.description ? (
                <p className="truncate text-[11px] text-muted-foreground">{log.description}</p>
              ) : null}
            </div>
            <span className="font-mono font-semibold">{(log.durationSec / 3600).toFixed(2)}h</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Restart timer"
              onClick={() => void onRestart(log.taskId)}
            >
              <Play className="size-3.5" />
            </Button>
            {!locked ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-destructive"
                aria-label="Delete time entry"
                onClick={() => void onDelete(log.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
