"use client";

import { isShareableWidgetId, ROUTES } from "@kloqra/contracts";
import type { DashboardReportDto, Permission, TeamMemberDto } from "@kloqra/contracts";
import {
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  WidgetShell
} from "@kloqra/ui";
import {
  applyDashboardPeriodPreset,
  buildWidgetMinSizeMap,
  DashboardArrangeBanner,
  DashboardPeriodFilter,
  DASHBOARD_GRID_BREAKPOINTS,
  DASHBOARD_GRID_COLS,
  generateResponsiveLayouts,
  getEffectiveWorkspaceId,
  isPersistableDashboardBreakpoint,
  fetchProjectTeam,
  matchDashboardPeriodPreset,
  ReportScopeFilters,
  type DashboardBreakpoint,
  type DashboardPeriodPreset,
  type DashboardPeriodSelection,
  useEntryCatalogQueries,
  useTasksListQuery,
  localMidnightUtcInZone,
  useDisplayPreferences,
  useWorkspaceOperationalSettings
} from "@kloqra/web-shared";
import { Clock, DollarSign, Folder, Users } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WidthProvider, Responsive } from "react-grid-layout";
import { toast } from "sonner";
import { DashboardAppBarActions } from "./dashboard-app-bar-actions";
import { filterWidgetsForDashboardMode } from "./dashboard-composition";
import {
  PersonalDashboardWidget,
  usePersonalDashboardData,
  filterPersonalDashboardData
} from "./personal-dashboard";
import { useWidgetLayout } from "./use-widget-layout";
import type { WidgetLayoutItem } from "./use-widget-layout";
import { WidgetControlPanel } from "./widget-control-panel";
import { ACTIVE_WIDGET_REGISTRY as WIDGET_REGISTRY } from "./widget-registry";
import { WidgetShareButton } from "./widget-share-button";
import { widgetShareOptionsForId } from "./widget-share-utils";
import {
  ActiveTimersWidget,
  BillabilityGaugeWidget,
  BillableSplitDonutWidget,
  BudgetBurnDownWidget,
  CategoryProjectHeatmapWidget,
  HeatmapWidget,
  HourlyRatesWidget,
  LivePresenceWidget,
  MemberLeaderboardWidget,
  PendingTimesheetsWidget,
  ProjectHealthWidget,
  RateEfficiencyWidget,
  RevenueTrendWidget,
  TaskBreakdownWidget,
  TeamUtilizationWidget
} from "./widgets-lazy";
import { DashboardSkeleton } from "@/components/app-page";
import {
  DailyStackedBarChart,
  ReportDonutChart,
  ReportBreakdownTable,
  WeeklyActivityChart,
  RevenueByProjectChart,
  HoursByMemberChart
} from "@/components/charts-lazy";
import { DashboardStatCard } from "@/components/dashboard-stat-card";
import { LivePresenceBadge } from "@/components/live-presence-badge";
import { formatDurationClock } from "@/components/report-charts";
import { TimeTrackerImportModal } from "@/features/time-tracker/time-tracker-import-modal";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";

// Types
type ChartByMode = "billability" | "project";
type GroupByMode = "user" | "project";

const ResponsiveGridLayout = WidthProvider(Responsive);

const ADMIN_PERIOD_PRESETS = [
  { value: "week" as const, label: "This week" },
  { value: "month" as const, label: "This month" }
];

function rangeQuery(
  start: string,
  end: string,
  filters?: {
    projectId?: string | string[];
    userId?: string | string[];
    categoryId?: string;
    taskId?: string;
  },
  timezone?: string
) {
  const effectiveTz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const [fy, fm, fd] = start.split("-").map(Number);
  const [ty, tm, td] = end.split("-").map(Number);
  const from = localMidnightUtcInZone(fy, fm, fd, effectiveTz);
  const to = new Date(
    localMidnightUtcInZone(ty, tm, td, effectiveTz).getTime() + 24 * 60 * 60 * 1000 - 1
  );
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString()
  });
  if (filters?.projectId) {
    if (Array.isArray(filters.projectId)) {
      if (filters.projectId.length > 0) {
        params.set("projectId", filters.projectId.join(","));
      }
    } else {
      params.set("projectId", filters.projectId);
    }
  }
  if (filters?.userId) {
    if (Array.isArray(filters.userId)) {
      if (filters.userId.length > 0) {
        params.set("userId", filters.userId.join(","));
      }
    } else {
      params.set("userId", filters.userId);
    }
  }
  if (filters?.categoryId) params.set("categoryId", filters.categoryId);
  if (filters?.taskId) params.set("taskId", filters.taskId);
  return params;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export type ManagementDashboardPageProps = {
  capabilities: readonly Permission[];
  showPersonal: boolean;
  showManagement: boolean;
  workspaceWide: boolean;
  projectIds: readonly string[];
  onAppBarActionsChange?: (actions: ReactNode | null) => void;
  onAppBarDescriptionChange?: (description: string | null) => void;
};

export function ManagementDashboardPage({
  capabilities,
  showPersonal,
  showManagement,
  workspaceWide,
  projectIds: scopedProjectIds,
  onAppBarActionsChange,
  onAppBarDescriptionChange
}: ManagementDashboardPageProps) {
  const session = useSessionStore((s) => s.session);
  const ws = getEffectiveWorkspaceId() ?? session?.workspaceId ?? "";
  const { timezone: displayTimezone } = useDisplayPreferences();
  const { timezone: workspaceTimezone } = useWorkspaceOperationalSettings(
    ws,
    Boolean(ws && showManagement)
  );
  const timezone = showManagement ? workspaceTimezone : displayTimezone;
  const canReadPresence =
    capabilities.includes("workspace:ReadPresence") ||
    capabilities.includes("project:ReadPresence");
  const canCreateWorkspaceExport = capabilities.includes("workspace:CreateExport");
  const canImportTime = capabilities.includes("personal:ManageTimelogs");

  const [range, setRange] = useState<DashboardPeriodSelection>("week");
  const [startDate, setStartDate] = useState<string>(
    () => applyDashboardPeriodPreset("week", timezone).from
  );
  const [endDate, setEndDate] = useState<string>(
    () => applyDashboardPeriodPreset("week", timezone).to
  );
  const [projectId, setProjectId] = useState<string[]>(() =>
    showManagement && !workspaceWide ? [...scopedProjectIds] : []
  );
  const [userId, setUserId] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [taskId, setTaskId] = useState("");
  const catalog = useEntryCatalogQueries(ws, { enabled: Boolean(ws) });
  const projects =
    showPersonal && !showManagement
      ? catalog.projects
      : workspaceWide
        ? catalog.projects
        : catalog.projects.filter((project) => scopedProjectIds.includes(project.id));
  const categories = catalog.categories;

  const taskFilters = useMemo(() => {
    if (projectId.length === 0) return undefined;
    const filters: Record<string, string | string[]> = { projectId };
    if (categoryId) filters.categoryId = categoryId;
    return filters;
  }, [projectId, categoryId]);

  const { data: tasks = [] } = useTasksListQuery(
    ws,
    taskFilters,
    Boolean(ws && projectId.length > 0)
  );
  const [teamMembers, setTeamMembers] = useState<TeamMemberDto[]>([]);
  const [report, setReport] = useState<DashboardReportDto | null>(null);
  const [loading, setLoading] = useState(showManagement);
  const [error, setError] = useState<string | null>(null);
  const personalDataRaw = usePersonalDashboardData(showPersonal, { startDate, endDate });
  const personalData = useMemo(
    () =>
      filterPersonalDashboardData(personalDataRaw, {
        projectIds: projectId,
        categoryId,
        taskId
      }),
    [personalDataRaw, projectId, categoryId, taskId]
  );

  // Keep date ranges in sync with the loaded/updated timezone preference
  const lastTimezoneRef = useRef(timezone);
  useEffect(() => {
    if (timezone !== lastTimezoneRef.current) {
      lastTimezoneRef.current = timezone;
      if (range !== "custom") {
        const { from, to } = applyDashboardPeriodPreset(range, timezone);
        setStartDate(from);
        setEndDate(to);
      }
    }
  }, [timezone, range]);

  function handleRangePresetChange(newRange: DashboardPeriodPreset) {
    setRange(newRange);
    const { from, to } = applyDashboardPeriodPreset(newRange, timezone);
    setStartDate(from);
    setEndDate(to);
  }

  function handleDateRangeChange(from: string, to: string) {
    setStartDate(from);
    setEndDate(to);
    setRange(matchDashboardPeriodPreset(from, to, ["week", "month"], timezone) ?? "custom");
  }

  // Widget Customization UI States
  const [mounted, setMounted] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isArranging, setIsArranging] = useState(false);
  const [gridBreakpoint, setGridBreakpoint] = useState<DashboardBreakpoint>("lg");
  const [widgetHeaderActions, setWidgetHeaderActions] = useState<Record<string, ReactNode>>({});

  // Widget Local Grouping/Config States
  const [dailyChartBy, setDailyChartBy] = useState<ChartByMode>("billability");
  const [breakdownGroupBy, setBreakdownGroupBy] = useState<GroupByMode>("user");
  const [distributionGroupBy, setDistributionGroupBy] = useState<GroupByMode>("user");

  // Layout Store Selectors
  const layoutsByWorkspace = useWidgetLayout((s) => s.layoutsByWorkspace);
  const initialized = useWidgetLayout((s) => s.initialized);
  const initialize = useWidgetLayout((s) => s.initialize);
  const updateLayout = useWidgetLayout((s) => s.updateLayout);
  const persistLayout = useWidgetLayout((s) => s.persistLayout);
  const saveLayoutAsDefault = useWidgetLayout((s) => s.saveLayoutAsDefault);
  const restoreLayout = useWidgetLayout((s) => s.restoreLayout);
  const toggleWidget = useWidgetLayout((s) => s.toggleWidget);
  const resetLayout = useWidgetLayout((s) => s.resetLayout);

  const arrangeSnapshotRef = useRef<WidgetLayoutItem[] | null>(null);

  const selectedProject = Array.isArray(projectId)
    ? projectId.length === 1
      ? projects.find((p) => p.id === projectId[0])
      : null
    : projects.find((p) => p.id === projectId);

  const selectedMember = Array.isArray(userId)
    ? userId.length === 1
      ? teamMembers.find((m) => m.userId === userId[0])
      : null
    : teamMembers.find((m) => m.userId === userId);

  const selectedTask = tasks.find((t) => t.id === taskId);

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams({
      from: startDate,
      to: endDate,
      mode: "custom"
    });
    if (projectId && projectId.length > 0) {
      params.set("projectId", projectId.join(","));
    }
    if (userId && userId.length > 0) {
      params.set("userId", userId.join(","));
    }
    if (categoryId) {
      params.set("categoryId", categoryId);
    }
    if (taskId) {
      params.set("taskId", taskId);
    }
    return `/exports?${params.toString()}`;
  }, [startDate, endDate, projectId, userId, categoryId, taskId]);

  const scopeLabel = selectedTask
    ? `${selectedTask.taskName} · ${selectedProject?.name ?? "1 project"}`
    : selectedMember
      ? `${selectedMember.userName} · ${selectedProject?.name ?? "1 project"}`
      : Array.isArray(userId) && userId.length > 0
        ? userId.length === 1
          ? `${teamMembers.find((m) => m.userId === userId[0])?.userName ?? "1 member"} · ${selectedProject?.name ?? "1 project"}`
          : `${userId.length} members · ${selectedProject?.name ?? "1 project"}`
        : Array.isArray(projectId)
          ? projectId.length === 1
            ? (selectedProject?.name ?? "1 project")
            : projectId.length > 1
              ? `${projectId.length} projects`
              : "All workspace"
          : selectedProject
            ? selectedProject.name
            : "All workspace";

  // Prevent SSR layout hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!ws || projectId.length === 0) {
      setTeamMembers([]);
      return;
    }

    const projectIds = Array.isArray(projectId) ? projectId : [projectId];

    Promise.all(
      projectIds.map((id) =>
        fetchProjectTeam(id, { workspaceId: ws })
          .then((res) => res.members)
          .catch(() => [])
      )
    ).then((teamsMembersLists) => {
      const uniqueMembersMap = new Map<string, TeamMemberDto>();
      for (const list of teamsMembersLists) {
        for (const m of list) {
          uniqueMembersMap.set(m.userId, m);
        }
      }
      setTeamMembers([...uniqueMembersMap.values()]);
    });
  }, [ws, projectId]);

  useEffect(() => {
    if (!projectId.length) {
      setUserId([]);
      setTaskId("");
    }
  }, [projectId.length]);

  useEffect(() => {
    if (!userId || userId.length === 0) return;
    const validUserIds = userId.filter((id) => teamMembers.some((m) => m.userId === id));
    if (validUserIds.length !== userId.length) {
      setUserId(validUserIds);
    }
  }, [teamMembers, userId]);

  useEffect(() => {
    if (!taskId) return;
    if (!tasks.some((t) => t.id === taskId)) {
      setTaskId("");
    }
  }, [tasks, taskId]);

  // Initialize Layout from Store
  useEffect(() => {
    if (ws) {
      void initialize(ws);
    }
  }, [ws, initialize]);

  const handleCancelArranging = useCallback(() => {
    if (arrangeSnapshotRef.current && ws) {
      restoreLayout(ws, arrangeSnapshotRef.current);
    }
    arrangeSnapshotRef.current = null;
    setIsArranging(false);
  }, [ws, restoreLayout]);

  // Handle Keyboard Escape shortcut to close grid customizer
  useEffect(() => {
    if (!isCatalogOpen && !isArranging) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (isArranging) {
          handleCancelArranging();
        } else {
          setIsCatalogOpen(false);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCatalogOpen, isArranging, handleCancelArranging]);

  function onProjectChange(nextId: string[]) {
    if (showPersonal && !showManagement) {
      setProjectId(nextId);
      setUserId([]);
      setTaskId("");
      return;
    }
    const allowedIds = nextId.filter((id) => scopedProjectIds.includes(id));
    setProjectId(
      workspaceWide ? nextId : allowedIds.length > 0 ? allowedIds : [...scopedProjectIds]
    );
    setUserId([]);
    setTaskId("");
  }

  function onCategoryChange(nextId: string) {
    setCategoryId(nextId);
    setTaskId("");
  }

  function clearScopeFilters() {
    if (showPersonal && !showManagement) {
      setProjectId([]);
      setUserId([]);
      setCategoryId("");
      setTaskId("");
      return;
    }
    setProjectId(workspaceWide ? [] : [...scopedProjectIds]);
    setUserId([]);
    setCategoryId("");
    setTaskId("");
  }

  const load = useCallback(() => {
    if (!showManagement || !ws) {
      setLoading(false);
      setError(null);
      return;
    }
    if (!workspaceWide && projectId.length === 0) {
      setLoading(false);
      setError("No managed projects are available for management analytics.");
      return;
    }
    setLoading(true);
    setError(null);
    api<DashboardReportDto>(
      `${ROUTES.REPORTING.DASHBOARD}?${rangeQuery(
        startDate,
        endDate,
        {
          projectId: projectId,
          userId: userId,
          categoryId: categoryId || undefined,
          taskId: taskId || undefined
        },
        timezone
      )}`,
      { workspaceId: ws }
    )
      .then(setReport)
      .catch(() => setError("Could not load analytics. Is the API running on port 3001?"))
      .finally(() => setLoading(false));
  }, [
    showManagement,
    ws,
    workspaceWide,
    startDate,
    endDate,
    projectId,
    userId,
    categoryId,
    taskId,
    timezone
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const handleResetLayout = () => {
    void resetLayout(ws)
      .then(() => toast.success("Dashboard layout reset to default"))
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Could not reset dashboard layout")
      );
  };

  const handleDoneArranging = async () => {
    try {
      await persistLayout(ws);
      arrangeSnapshotRef.current = null;
      setIsArranging(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save dashboard layout");
    }
  };

  const handleDoneAndSaveAsDefault = async () => {
    try {
      await persistLayout(ws);
      await saveLayoutAsDefault(ws);
      arrangeSnapshotRef.current = null;
      setIsArranging(false);
      toast.success("Layout saved as default");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save dashboard layout");
    }
  };

  const updateHeaderAction = useCallback((id: string, node: React.ReactNode) => {
    setWidgetHeaderActions((prev) => {
      if (prev[id] === node) return prev;
      return { ...prev, [id]: node };
    });
  }, []);

  const handleBudgetBurndownActions = useCallback(
    (node: React.ReactNode) => {
      updateHeaderAction("budget_burndown", node);
    },
    [updateHeaderAction]
  );

  const handleTeamUtilizationActions = useCallback(
    (node: React.ReactNode) => {
      updateHeaderAction("team_utilization", node);
    },
    [updateHeaderAction]
  );

  const handlePendingTimesheetsActions = useCallback(
    (node: React.ReactNode) => {
      updateHeaderAction("pending_timesheets", node);
    },
    [updateHeaderAction]
  );

  const allowedWidgetRegistry = useMemo(
    () =>
      filterWidgetsForDashboardMode(WIDGET_REGISTRY, {
        capabilities,
        showPersonal,
        showManagement
      }),
    [capabilities, showManagement, showPersonal]
  );
  const allowedWidgetIds = useMemo(
    () => new Set(allowedWidgetRegistry.map((widget) => widget.id)),
    [allowedWidgetRegistry]
  );
  const activeLayout = (layoutsByWorkspace[ws] || []).filter((item) =>
    allowedWidgetIds.has(item.i)
  );
  const visibleItems = activeLayout.filter((item) => item.visible);

  const handleAddWidgets = useCallback(() => {
    setIsCatalogOpen((open) => !open);
    if (isArranging) {
      handleCancelArranging();
    }
  }, [isArranging, handleCancelArranging]);

  const handleArrangeGrid = useCallback(async () => {
    if (isArranging) {
      try {
        await persistLayout(ws);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save dashboard layout");
        return;
      }
      arrangeSnapshotRef.current = null;
    } else {
      const current = layoutsByWorkspace[ws];
      if (current) {
        arrangeSnapshotRef.current = current.map((item) => ({ ...item }));
      }
    }
    setIsArranging((arranging) => !arranging);
    setIsCatalogOpen(false);
  }, [isArranging, layoutsByWorkspace, persistLayout, ws]);

  const appBarActions = useMemo(
    () => (
      <DashboardAppBarActions
        canImport={canImportTime}
        exportUrl={showManagement && canCreateWorkspaceExport ? exportUrl : null}
        catalogOpen={isCatalogOpen}
        arranging={isArranging}
        onImport={() => setImportOpen(true)}
        onAddWidgets={handleAddWidgets}
        onArrange={() => void handleArrangeGrid()}
      />
    ),
    [
      canImportTime,
      showManagement,
      canCreateWorkspaceExport,
      exportUrl,
      isCatalogOpen,
      isArranging,
      handleAddWidgets,
      handleArrangeGrid
    ]
  );

  useEffect(() => {
    onAppBarActionsChange?.(appBarActions);
    return () => onAppBarActionsChange?.(null);
  }, [appBarActions, onAppBarActionsChange]);

  const widgetMinSizes = useMemo(
    () => buildWidgetMinSizeMap(allowedWidgetRegistry),
    [allowedWidgetRegistry]
  );

  const responsiveLayouts = useMemo(
    () => generateResponsiveLayouts(visibleItems, DASHBOARD_GRID_COLS, widgetMinSizes),
    [visibleItems, widgetMinSizes]
  );

  const colorByProjectId = Object.fromEntries(projects.map((p) => [p.id, p.color]));
  const hasData = (report?.workspace.totalHours ?? 0) > 0;
  const periodLabel = report
    ? `${formatDate(report.period.from)} – ${formatDate(report.period.to)}`
    : `${formatDate(`${startDate}T12:00:00`)} – ${formatDate(`${endDate}T12:00:00`)}`;

  useEffect(() => {
    const clientLabel =
      showManagement && selectedProject?.clientName && !selectedMember
        ? ` · ${selectedProject.clientName}`
        : "";
    const description = `${showManagement ? scopeLabel : "My work"} · ${periodLabel}${clientLabel}`;
    onAppBarDescriptionChange?.(description);
    return () => onAppBarDescriptionChange?.(null);
  }, [
    onAppBarDescriptionChange,
    periodLabel,
    scopeLabel,
    selectedMember,
    selectedProject?.clientName,
    showManagement
  ]);

  // Widget Catalogue Render Lookup
  function renderWidgetContent(id: string) {
    if (id.startsWith("personal_")) {
      return <PersonalDashboardWidget id={id} data={personalData} />;
    }
    if (loading) {
      return <div className="h-full min-h-24 animate-pulse rounded-md bg-muted" />;
    }
    if (!report) {
      return (
        <div className="flex h-full min-h-24 flex-col items-center justify-center p-4 text-center">
          <p className="text-xs font-semibold text-muted-foreground">
            {error ?? "Management data is unavailable."}
          </p>
          <Button className="mt-3" size="sm" variant="outline" onClick={load}>
            Try again
          </Button>
        </div>
      );
    }

    switch (id) {
      case "stat_total_hours":
        return (
          <DashboardStatCard
            label="Total Hours"
            value={formatDurationClock(report!.workspace.totalHours)}
            hint={`${report!.workspace.activeMembers} members active`}
            icon={Clock}
            tone="primary"
          />
        );
      case "stat_billable":
        return (
          <DashboardStatCard
            label="Billable Hours"
            value={formatDurationClock(report!.workspace.billableHours)}
            hint={`${report!.workspace.billablePercent}% of total`}
            icon={DollarSign}
            tone="success"
          />
        );
      case "stat_nonbillable":
        return (
          <DashboardStatCard
            label="Non-Billable"
            value={formatDurationClock(report!.workspace.nonBillableHours)}
            icon={Clock}
            tone="warning"
          />
        );
      case "stat_revenue":
        return (
          <DashboardStatCard
            label="Revenue"
            value={`$${formatMoney(report!.workspace.totalAmount)}`}
            hint={report!.workspace.currency}
            icon={DollarSign}
            tone="premium"
          />
        );
      case "stat_projects":
        return (
          <DashboardStatCard
            label="Active Projects"
            value={String(report!.workspace.activeProjects)}
            hint="With time logged"
            icon={Folder}
            tone="premium"
          />
        );
      case "stat_members":
        return (
          <DashboardStatCard
            label="Active Members"
            value={String(report!.workspace.activeMembers)}
            hint="With time logged"
            icon={Users}
            tone="warning"
          />
        );
      case "budget_burndown":
        return (
          <BudgetBurnDownWidget
            projectId={projectId || undefined}
            cardless
            onHeaderActions={handleBudgetBurndownActions}
          />
        );
      case "team_utilization":
        return (
          <TeamUtilizationWidget
            from={report!.period.from}
            to={report!.period.to}
            userId={userId || undefined}
            projectId={projectId || undefined}
            categoryId={categoryId || undefined}
            taskId={taskId || undefined}
            cardless
            onHeaderActions={handleTeamUtilizationActions}
          />
        );
      case "daily_chart":
        return (
          <DailyStackedBarChart
            report={report!}
            chartBy={dailyChartBy}
            projectColors={colorByProjectId}
          />
        );
      case "weekly_chart":
        return <WeeklyActivityChart report={report!} />;
      case "revenue_by_project":
        return <RevenueByProjectChart report={report!} projectColors={colorByProjectId} />;
      case "hours_by_member":
        return <HoursByMemberChart report={report!} />;
      case "breakdown_table":
        return (
          <ReportBreakdownTable
            report={report!}
            groupBy={breakdownGroupBy}
            projectColors={colorByProjectId}
          />
        );
      case "distribution_donut":
        return (
          <ReportDonutChart
            report={report!}
            groupBy={distributionGroupBy}
            projectColors={colorByProjectId}
          />
        );

      // Phase 6 - New Widget Implementation
      case "billability_gauge":
        return <BillabilityGaugeWidget report={report!} />;
      case "revenue_trend":
        return <RevenueTrendWidget report={report!} />;
      case "project_health":
        return <ProjectHealthWidget report={report!} />;
      case "member_leaderboard":
        return <MemberLeaderboardWidget report={report!} />;
      case "billable_split_donut":
        return <BillableSplitDonutWidget report={report!} />;
      case "hourly_rates":
        return (
          <HourlyRatesWidget projectId={projectId || undefined} userId={userId || undefined} />
        );
      case "live_presence":
        return (
          <LivePresenceWidget projectId={projectId || undefined} userId={userId || undefined} />
        );
      case "pending_timesheets":
        return (
          <PendingTimesheetsWidget
            projectId={projectId || undefined}
            userId={userId || undefined}
            onHeaderActions={handlePendingTimesheetsActions}
          />
        );
      case "time_of_day_heatmap":
        return (
          <HeatmapWidget
            from={startDate}
            to={endDate}
            projectId={projectId || undefined}
            userId={userId || undefined}
            categoryId={categoryId || undefined}
            taskId={taskId || undefined}
          />
        );
      case "category_distribution":
        return (
          <ReportDonutChart report={report!} groupBy="category" projectColors={colorByProjectId} />
        );
      case "category_breakdown":
        return (
          <ReportBreakdownTable
            report={report!}
            groupBy="category"
            projectColors={colorByProjectId}
          />
        );
      case "category_project_heatmap":
        return (
          <CategoryProjectHeatmapWidget
            from={startDate}
            to={endDate}
            projectId={projectId || undefined}
            userId={userId || undefined}
            categoryId={categoryId || undefined}
            taskId={taskId || undefined}
          />
        );
      case "task_breakdown":
        return (
          <TaskBreakdownWidget
            from={startDate}
            to={endDate}
            projectId={projectId || undefined}
            userId={userId || undefined}
            categoryId={categoryId || undefined}
            taskId={taskId || undefined}
          />
        );
      case "rate_efficiency":
        return <RateEfficiencyWidget report={report!} />;
      case "active_timers":
        return (
          <ActiveTimersWidget
            projectFilterNames={
              projectId.length > 0
                ? (projectId
                    .map((id) => projects.find((p) => p.id === id)?.name)
                    .filter(Boolean) as string[])
                : undefined
            }
            userId={userId.length > 0 ? userId : undefined}
          />
        );

      default:
        return (
          <div className="flex h-full flex-col items-center justify-center text-center p-4">
            <p className="text-xs font-semibold text-muted-foreground">Analytics Widget</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-[185px]">
              This widget layout is not registered.
            </p>
          </div>
        );
    }
  }

  // Get dynamic header action controls (e.g. filters) per widget type
  function renderWidgetShareButton(id: string) {
    if (!isShareableWidgetId(id)) return null;
    const widgetDef = WIDGET_REGISTRY.find((w) => w.id === id);
    return (
      <WidgetShareButton
        workspaceId={ws}
        widgetId={id}
        widgetLabel={widgetDef?.label ?? "Widget"}
        startDate={startDate}
        endDate={endDate}
        projectId={projectId || undefined}
        userId={userId || undefined}
        categoryId={categoryId || undefined}
        taskId={taskId || undefined}
        options={widgetShareOptionsForId(id, {
          dailyChartBy,
          breakdownGroupBy,
          distributionGroupBy
        })}
        timezone={timezone}
      />
    );
  }

  function wrapWidgetHeaderControls(id: string, controls: React.ReactNode) {
    const shareButton = renderWidgetShareButton(id);
    if (!shareButton && !controls) return null;
    if (!shareButton) return controls;
    return (
      <div
        className="flex items-center gap-1.5 mr-1 select-none widget-no-drag"
        onClick={(e) => e.stopPropagation()}
      >
        {controls}
        {shareButton}
      </div>
    );
  }

  function renderWidgetHeaderControls(id: string) {
    if (id === "daily_chart") {
      return wrapWidgetHeaderControls(
        id,
        <Select value={dailyChartBy} onValueChange={(v) => setDailyChartBy(v as ChartByMode)}>
          <SelectTrigger className="h-6 w-24 text-[10px] px-2 py-0 bg-background/50 hover:bg-background border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="billability" className="text-[10px] py-1">
              Billability
            </SelectItem>
            <SelectItem value="project" className="text-[10px] py-1">
              Project
            </SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (id === "breakdown_table") {
      return wrapWidgetHeaderControls(
        id,
        <Select
          value={breakdownGroupBy}
          onValueChange={(v) => setBreakdownGroupBy(v as GroupByMode)}
        >
          <SelectTrigger className="h-6 w-20 text-[10px] px-2 py-0 bg-background/50 hover:bg-background border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user" className="text-[10px] py-1">
              User
            </SelectItem>
            <SelectItem value="project" className="text-[10px] py-1">
              Project
            </SelectItem>
            <SelectItem value="category" className="text-[10px] py-1">
              Category
            </SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (id === "distribution_donut") {
      return wrapWidgetHeaderControls(
        id,
        <Select
          value={distributionGroupBy}
          onValueChange={(v) => setDistributionGroupBy(v as GroupByMode)}
        >
          <SelectTrigger className="h-6 w-20 text-[10px] px-2 py-0 bg-background/50 hover:bg-background border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user" className="text-[10px] py-1">
              User
            </SelectItem>
            <SelectItem value="project" className="text-[10px] py-1">
              Project
            </SelectItem>
            <SelectItem value="category" className="text-[10px] py-1">
              Category
            </SelectItem>
          </SelectContent>
        </Select>
      );
    }

    // Default returns any async-reported badge actions (like budget status or team target)
    return wrapWidgetHeaderControls(id, widgetHeaderActions[id] || null);
  }

  return (
    <section aria-label="Dashboard widgets" className="space-y-8 min-h-screen pb-16">
      {showManagement && canReadPresence ? (
        <div className="flex justify-end">
          <LivePresenceBadge />
        </div>
      ) : null}

      {/* Customize Toolbar Banner */}
      {isCatalogOpen && (
        <WidgetControlPanel
          layoutItems={activeLayout}
          widgets={allowedWidgetRegistry}
          onToggleWidget={(id) => toggleWidget(ws, id)}
          onResetLayout={handleResetLayout}
          onClose={() => setIsCatalogOpen(false)}
        />
      )}

      {isArranging && (
        <DashboardArrangeBanner
          editModeLabel="Full-Width Edit Mode"
          onCancel={handleCancelArranging}
          onResetLayout={handleResetLayout}
          onDone={handleDoneArranging}
          onSaveAsDefault={handleDoneAndSaveAsDefault}
        />
      )}

      {showPersonal || showManagement ? (
        <Card>
          <CardContent className="flex flex-col gap-4 py-4">
            <DashboardPeriodFilter
              range={range}
              onPresetChange={handleRangePresetChange}
              startDate={startDate}
              endDate={endDate}
              onDateRangeChange={handleDateRangeChange}
              presets={ADMIN_PERIOD_PRESETS}
              dateRangeAriaLabel="Dashboard date range"
            />

            <ReportScopeFilters
              compact
              taskRequiresProject
              memberRequiresProject={showManagement}
              hideMemberFilter={!showManagement}
              memberAllLabel="Everyone on project"
              memberPlaceholder="Everyone on project"
              hintText={
                showManagement
                  ? "Optional — narrow charts and exports"
                  : "Optional — narrow your personal widgets"
              }
              values={{ projectId, categoryId, taskId, userId }}
              projects={projects}
              categories={categories}
              tasks={tasks}
              members={
                showManagement
                  ? teamMembers.map((m) => ({ userId: m.userId, userName: m.userName }))
                  : []
              }
              onProjectChange={onProjectChange}
              onCategoryChange={onCategoryChange}
              onTaskChange={setTaskId}
              onUserChange={setUserId}
              onClearAll={clearScopeFilters}
            />
          </CardContent>
        </Card>
      ) : null}

      {showManagement && !loading && !error && !hasData ? (
        <p className="text-sm text-muted-foreground">
          No management time was recorded in this period.
        </p>
      ) : null}

      <div className="relative">
        {!mounted || !initialized ? (
          <DashboardSkeleton />
        ) : (
          <ResponsiveGridLayout
            className={`layout ${isArranging ? "layout-customizing" : ""}`}
            layouts={responsiveLayouts}
            breakpoints={DASHBOARD_GRID_BREAKPOINTS}
            cols={DASHBOARD_GRID_COLS}
            rowHeight={80}
            compactType="vertical"
            isDraggable={isArranging}
            isResizable={isArranging}
            draggableCancel="button, a, input, select, textarea, [role='menu'], [role='menuitem'], .widget-no-drag"
            resizeHandles={["s", "e", "se"]}
            onBreakpointChange={(breakpoint) =>
              setGridBreakpoint(breakpoint as DashboardBreakpoint)
            }
            onLayoutChange={(currentLayout) => {
              if (isArranging && isPersistableDashboardBreakpoint(gridBreakpoint)) {
                updateLayout(ws, currentLayout, { persist: false });
              }
            }}
            margin={[16, 16]}
            containerPadding={[0, 0]}
          >
            {visibleItems.map((item) => {
              const widgetDef = WIDGET_REGISTRY.find((w) => w.id === item.i);
              const label = widgetDef?.label ?? "Widget";
              return (
                <div key={item.i} className="min-w-0 h-full w-full">
                  <WidgetShell
                    id={item.i}
                    label={label}
                    isEditing={isArranging}
                    showTitleInView={widgetDef?.group !== "kpi"}
                    headerActions={renderWidgetHeaderControls(item.i)}
                  >
                    {renderWidgetContent(item.i)}
                  </WidgetShell>
                </div>
              );
            })}
          </ResponsiveGridLayout>
        )}
      </div>

      <TimeTrackerImportModal open={importOpen} onOpenChange={setImportOpen} onImported={load} />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
