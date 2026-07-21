"use client";

import { ROUTES, type TimeLogDto } from "@kloqra/contracts";
import { DashboardStatCard } from "@kloqra/ui";
import {
  SUBMISSIONS_LOOKBACK_WEEKS,
  localMidnightUtcInZone,
  logStartDateKey,
  todayInZone,
  toDateKeyInZone,
  useDisplayPreferences,
  useEntryCatalogQueries,
  useMySubmissionsLookbackQuery,
  usePreferenceTodayDateKey,
  useTimelogListAllQuery,
  useTimelogMutations
} from "@kloqra/web-shared";
import { CalendarCheck, Clock, Folder } from "lucide-react";
import { useMemo } from "react";
import {
  CategorySplitWidget,
  ProjectSplitWidget,
  TodayLogsWidget,
  WeeklyProgressWidget
} from "./widgets/personal-data-widgets";
import { QuickTimerWidget } from "./widgets/quick-timer-widget";
import { countActionableSubmissions } from "@/features/submissions/use-my-submissions";
import {
  buildSubmissionByKey,
  isTimeEntryLocked
} from "@/features/time-tracker/entry-approval-status";
import { DailyGoalWidget, QuickActions } from "@/features/timer/timer-dynamic-widgets";
import { useTimerActions } from "@/features/timer/use-timer-actions";
import { useSessionStore } from "@/stores/session.store";

function sumDuration(logs: readonly TimeLogDto[]) {
  return logs.reduce((total, log) => total + log.durationSec, 0);
}

function formatHours(seconds: number) {
  return `${(seconds / 3600).toFixed(2)}h`;
}

export function usePersonalDashboardData(
  enabled: boolean,
  range: { startDate: string; endDate: string }
) {
  const session = useSessionStore((state) => state.session);
  const workspaceId = session?.workspaceId ?? "";
  const { timezone } = useDisplayPreferences();
  const logsPath = useMemo(() => {
    const [startYear, startMonth, startDay] = range.startDate.split("-").map(Number);
    const [endYear, endMonth, endDay] = range.endDate.split("-").map(Number);
    const from = localMidnightUtcInZone(startYear!, startMonth!, startDay!, timezone);
    const to = new Date(
      localMidnightUtcInZone(endYear!, endMonth!, endDay!, timezone).getTime() +
        24 * 60 * 60 * 1000 -
        1
    );
    return `${ROUTES.TIMELOGS.LIST}?${new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString()
    })}`;
  }, [range.endDate, range.startDate, timezone]);

  const queryEnabled = Boolean(enabled && workspaceId);
  const catalog = useEntryCatalogQueries(workspaceId, { enabled: queryEnabled });
  const { data: logsData, isLoading } = useTimelogListAllQuery(workspaceId, logsPath, queryEnabled);
  const anchorDateKey = usePreferenceTodayDateKey();
  const { data: submissions = [] } = useMySubmissionsLookbackQuery(
    workspaceId,
    anchorDateKey,
    SUBMISSIONS_LOOKBACK_WEEKS,
    "assigned",
    queryEnabled
  );

  const logs = useMemo(() => logsData?.items ?? [], [logsData?.items]);
  const todayKey = toDateKeyInZone(todayInZone(timezone), timezone);
  const todayLogs = logs.filter((log) => logStartDateKey(log, timezone) === todayKey);
  const todaySeconds = sumDuration(todayLogs);
  const recentSeconds = sumDuration(logs);
  const actionableSubmissions = countActionableSubmissions(submissions);
  const assignedProjects = catalog.projects.filter((project) => project.isActive).length;

  return {
    actionableSubmissions,
    assignedProjects,
    isLoading,
    logs,
    projects: catalog.projects,
    recentSeconds,
    startDate: range.startDate,
    endDate: range.endDate,
    submissions,
    tasks: catalog.tasks,
    timezone,
    todayLogs,
    todaySeconds,
    workspaceId
  };
}

export type PersonalDashboardData = ReturnType<typeof usePersonalDashboardData>;

function TodayLogsContainer({ data }: { data: PersonalDashboardData }) {
  const mutations = useTimelogMutations(data.workspaceId);
  const timer = useTimerActions(data.workspaceId);
  const submissionByKey = useMemo(() => buildSubmissionByKey(data.submissions), [data.submissions]);
  return (
    <TodayLogsWidget
      logs={data.logs}
      projects={data.projects}
      tasks={data.tasks}
      timezone={data.timezone}
      isLocked={(log) => {
        const task = data.tasks.find((item) => item.id === log.taskId);
        const project = task ? data.projects.find((item) => item.id === task.projectId) : undefined;
        return isTimeEntryLocked(log, project, submissionByKey);
      }}
      onDelete={mutations.remove}
      onRestart={async (taskId) => {
        await timer.start(taskId);
      }}
    />
  );
}

export function PersonalDashboardWidget({ id, data }: { id: string; data: PersonalDashboardData }) {
  switch (id) {
    case "personal_today":
      return (
        <DashboardStatCard
          label="Today"
          value={formatHours(data.todaySeconds)}
          hint={`${data.todayLogs.length} time ${
            data.todayLogs.length === 1 ? "entry" : "entries"
          }`}
          icon={Clock}
          tone="primary"
        />
      );
    case "personal_recent_hours":
      return (
        <DashboardStatCard
          label="Selected period"
          value={formatHours(data.recentSeconds)}
          hint="Your logged time"
          icon={CalendarCheck}
          tone="success"
        />
      );
    case "personal_category_split":
      return <CategorySplitWidget logs={data.logs} tasks={data.tasks} />;
    case "personal_project_split":
      return <ProjectSplitWidget logs={data.logs} projects={data.projects} tasks={data.tasks} />;
    case "personal_weekly_progress":
      return (
        <WeeklyProgressWidget
          logs={data.logs}
          startDate={data.startDate}
          endDate={data.endDate}
          timezone={data.timezone}
        />
      );
    case "personal_quick_timer":
      return (
        <QuickTimerWidget
          workspaceId={data.workspaceId}
          projects={data.projects}
          tasks={data.tasks}
        />
      );
    case "personal_today_logs":
      return <TodayLogsContainer data={data} />;
    case "personal_assigned_projects":
      return (
        <DashboardStatCard
          label="Assigned projects"
          value={String(data.assignedProjects)}
          hint="Active projects"
          icon={Folder}
          tone="premium"
        />
      );
    case "personal_timesheets_action":
      return (
        <DashboardStatCard
          label="Timesheets needing action"
          value={String(data.actionableSubmissions)}
          hint="Draft or returned"
          icon={CalendarCheck}
          tone="warning"
        />
      );
    case "personal_daily_progress":
      return (
        <DailyGoalWidget
          totalSeconds={data.todaySeconds}
          logs={data.logs}
          timezone={data.timezone}
          cardless
        />
      );
    case "personal_quick_access":
      return (
        <QuickActions
          mode="all"
          onSelect={(projectId, taskId) => {
            window.location.assign(
              `/timer?${new URLSearchParams({ projectId, taskId }).toString()}`
            );
          }}
        />
      );
    default:
      return null;
  }
}
