"use client";

import { ROUTES } from "@chronomint/contracts";
import type {
  TimeLogDto,
  ProjectDto,
  TaskDto,
  TimesheetPeriodDto,
  ActiveTimerDto
} from "@chronomint/contracts";
import {
  Button,
  Card,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ProjectColorDot,
  Input
} from "@chronomint/ui";
import { Play, Pause, Square, LayoutGrid, Move } from "lucide-react";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { WidthProvider, Responsive } from "react-grid-layout";
import { toast } from "sonner";
import { useWidgetLayout } from "./use-widget-layout";
import { WidgetControlPanel } from "./widget-control-panel";
import { WIDGET_REGISTRY } from "./widget-registry";
import { WidgetShell } from "./widget-shell";
import { ProjectSplitWidget } from "./widgets/project-split-widget";
import { TimesheetSubmissionsWidget } from "./widgets/timesheet-submissions-widget";
import { TodayLogsWidget } from "./widgets/today-logs-widget";
import { WeeklyProgressWidget } from "./widgets/weekly-progress-widget";
import { DailyGoalWidget } from "@/features/timer/daily-goal-widget";
import { QuickActions } from "@/features/timer/quick-actions";
import { startOfWeek, getWeekDays, toDateKey } from "@/features/timesheet/calendar-utils";
import { suggestBillableFromTask } from "@/features/timesheet/time-entry-dialog";
import { api } from "@/lib/api";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";
import { isActiveTimer, useTimerStore } from "@/stores/timer.store";

const NEW_TASK = "__new__";
const ResponsiveGridLayout = WidthProvider(Responsive);

function formatElapsed(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "00:00:00";
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const o = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, o, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function DashboardPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { active, elapsedSec, isPaused, setActive, tick } = useTimerStore();
  const { tasks, projects, setTasks, setProjects } = useProjectsStore();

  const [logs, setLogs] = useState<TimeLogDto[]>([]);
  const [submissions, setSubmissions] = useState<TimesheetPeriodDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Layout customizing states
  const [mounted, setMounted] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isArranging, setIsArranging] = useState(false);

  // Local active timer controls
  const [projectId, setProjectId] = useState("");
  const [taskChoice, setTaskChoice] = useState("");
  const [newTaskName, setNewTaskName] = useState("");
  const [stopDescription, setStopDescription] = useState("");
  const [isBillable, setIsBillable] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [resuming, setResuming] = useState(false);

  // Layout store selectors
  const layoutsByWorkspace = useWidgetLayout((s) => s.layoutsByWorkspace);
  const initialized = useWidgetLayout((s) => s.initialized);
  const initialize = useWidgetLayout((s) => s.initialize);
  const updateLayout = useWidgetLayout((s) => s.updateLayout);
  const toggleWidget = useWidgetLayout((s) => s.toggleWidget);
  const resetLayout = useWidgetLayout((s) => s.resetLayout);

  const activeTask = active ? tasks.find((t) => t.id === active.taskId) : null;
  const activeProject = activeTask ? projects.find((p) => p.id === activeTask.projectId) : null;
  const tracking = isActiveTimer(active);

  const canStart =
    Boolean(projectId) &&
    (taskChoice === NEW_TASK ? newTaskName.trim().length > 0 : Boolean(taskChoice));

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.projectId === projectId),
    [tasks, projectId]
  );

  // Prevent SSR layout hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize layout store
  useEffect(() => {
    if (ws) {
      initialize(ws);
    }
  }, [ws, initialize]);

  // Handle keydown escape to close Customize panels
  useEffect(() => {
    if (!isCatalogOpen && !isArranging) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCatalogOpen(false);
        setIsArranging(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCatalogOpen, isArranging]);

  const fetchLogs = useCallback(async () => {
    if (!ws) return;
    try {
      const today = new Date();
      const weekStart = startOfWeek(today);
      const weekDays = getWeekDays(weekStart);
      const params = new URLSearchParams({
        from: weekDays[0]!.toISOString(),
        to: new Date().toISOString()
      });
      const res = await api<{ items: TimeLogDto[] }>(`${ROUTES.TIMELOGS.LIST}?${params}`, {
        workspaceId: ws
      });
      setLogs(res.items || []);
    } catch {
      // ignore
    }
  }, [ws]);

  const fetchActiveTimer = useCallback(async () => {
    if (!ws) return;
    try {
      const res = await api<ActiveTimerDto | null>(ROUTES.TIMER.ACTIVE, {
        workspaceId: ws
      });
      setActive(res);
    } catch {
      // ignore
    }
  }, [ws, setActive]);

  const fetchSubmissions = useCallback(async () => {
    if (!ws) return;
    try {
      const res = await api<{ items: TimesheetPeriodDto[] }>(ROUTES.TIMESHEETS.MY_SUBMISSIONS, {
        workspaceId: ws
      });
      setSubmissions(res.items || []);
    } catch {
      // ignore
    }
  }, [ws]);

  const loadAll = useCallback(async () => {
    if (!ws) return;
    setLoading(true);
    try {
      await Promise.all([
        api<ProjectDto[]>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects),
        api<TaskDto[]>(ROUTES.TASKS.LIST, { workspaceId: ws }).then(setTasks),
        fetchLogs(),
        fetchSubmissions(),
        fetchActiveTimer()
      ]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [ws, setProjects, setTasks, fetchLogs, fetchSubmissions, fetchActiveTimer]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Keep timer ticking
  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  // Auto-fill billable default when project/task changes
  useEffect(() => {
    if (activeTask) {
      setIsBillable(activeTask.billableDefault);
    }
  }, [activeTask]);

  async function resolveTaskId(): Promise<string> {
    if (taskChoice !== NEW_TASK) return taskChoice;
    const created = await api<TaskDto>(ROUTES.TASKS.CREATE, {
      method: "POST",
      workspaceId: ws,
      body: JSON.stringify({ projectId, taskName: newTaskName.trim() })
    });
    const all = await api<TaskDto[]>(ROUTES.TASKS.LIST, { workspaceId: ws });
    setTasks(all);
    return created.id;
  }

  async function startTimer() {
    if (!canStart) return;
    setStarting(true);
    try {
      const taskId = await resolveTaskId();
      const res = await api<ActiveTimerDto>(ROUTES.TIMER.START, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ taskId })
      });
      setActive(res);
      setTaskChoice("");
      setNewTaskName("");
      toast.success("Timer started!");
      void fetchLogs();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not start timer";
      toast.error(message);
    } finally {
      setStarting(false);
    }
  }

  async function stopTimer() {
    setStopping(true);
    try {
      await api(ROUTES.TIMER.STOP, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          description: stopDescription.trim() || undefined,
          isBillable
        })
      });
      setActive(null);
      setStopDescription("");
      toast.success("Timer stopped! Time entry saved.");
      void fetchLogs();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not stop timer";
      toast.error(message);
    } finally {
      setStopping(false);
    }
  }

  async function pauseTimer() {
    setPausing(true);
    try {
      await api(ROUTES.TIMER.PAUSE, { method: "POST", workspaceId: ws });
      await fetchActiveTimer();
      toast.success("Timer paused");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not pause");
    } finally {
      setPausing(false);
    }
  }

  async function resumeTimer() {
    setResuming(true);
    try {
      await api(ROUTES.TIMER.RESUME, { method: "POST", workspaceId: ws });
      await fetchActiveTimer();
      toast.success("Timer resumed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resume");
    } finally {
      setResuming(false);
    }
  }

  const handleDeleteLog = async (logId: string) => {
    try {
      await api(`/timelogs/${logId}`, { method: "DELETE", workspaceId: ws });
      toast.success("Time entry deleted!");
      void fetchLogs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete time log");
    }
  };

  const handleResumeTask = async (taskId: string) => {
    try {
      const res = await api<ActiveTimerDto>(ROUTES.TIMER.START, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ taskId })
      });
      setActive(res);
      toast.success("Timer started!");
      void fetchLogs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not restart timer");
    }
  };

  const handleResetLayout = () => {
    resetLayout(ws);
    toast.success("Dashboard layout reset");
  };

  const handleQuickSelect = (pId: string, tId: string) => {
    setProjectId(pId);
    setTaskChoice(tId);
  };

  // Aggregates for Stats Cards
  const weekStats = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today);
    const weekDays = getWeekDays(weekStart);
    const dateKeys = weekDays.map((d) => toDateKey(d));

    const weekLogs = logs.filter((log) => {
      const logDate = new Date(log.startTime);
      return dateKeys.includes(toDateKey(logDate));
    });

    let totalSec = 0;
    let billableSec = 0;

    for (const log of weekLogs) {
      totalSec += log.durationSec;
      if (log.isBillable) {
        billableSec += log.durationSec;
      }
    }

    if (tracking) {
      totalSec += elapsedSec;
      if (isBillable) {
        billableSec += elapsedSec;
      }
    }

    return {
      totalHours: Math.round((totalSec / 3600) * 10) / 10,
      billableHours: Math.round((billableSec / 3600) * 10) / 10,
      assignedProjects: projects.filter((p) => p.isActive).length
    };
  }, [logs, projects, tracking, elapsedSec, isBillable]);

  const todayLoggedSec = useMemo(() => {
    const todayStr = toDateKey(new Date());
    const todayLogs = logs.filter((log) => toDateKey(new Date(log.startTime)) === todayStr);
    return todayLogs.reduce((sum, log) => sum + log.durationSec, 0);
  }, [logs]);

  const totalTodaySec = todayLoggedSec + (tracking ? elapsedSec : 0);

  // Layout configurations
  const activeLayout = layoutsByWorkspace[ws] || [];
  const visibleItems = activeLayout.filter((item) => item.visible);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="h-24 bg-card animate-pulse" />
          <Card className="h-24 bg-card animate-pulse" />
          <Card className="h-24 bg-card animate-pulse" />
        </div>
        <Card className="h-96 bg-card animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Analyze your weekly progress and customize your widget layout.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant={isCatalogOpen ? "secondary" : "outline"}
            onClick={() => {
              setIsCatalogOpen(!isCatalogOpen);
              setIsArranging(false);
            }}
            className="gap-1.5 text-xs h-9"
          >
            <LayoutGrid className="size-3.5" />
            {isCatalogOpen ? "Close Catalog" : "Add Widgets"}
          </Button>
          <Button
            size="sm"
            variant={isArranging ? "secondary" : "outline"}
            onClick={() => {
              setIsArranging(!isArranging);
              setIsCatalogOpen(false);
            }}
            className="gap-1.5 text-xs h-9"
          >
            <Move className="size-3.5" />
            {isArranging ? "Done Arranging" : "Arrange Widgets"}
          </Button>
        </div>
      </div>

      {/* Customize Panels */}
      {isCatalogOpen && (
        <WidgetControlPanel
          layoutItems={activeLayout}
          onToggleWidget={(id) => toggleWidget(ws, id)}
          onResetLayout={handleResetLayout}
          onClose={() => setIsCatalogOpen(false)}
        />
      )}

      {isArranging && (
        <div className="sticky top-0 z-40 w-full border border-border bg-card/85 backdrop-blur-md rounded-lg shadow-sm px-4 py-3 flex items-center justify-between animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="flex items-center gap-2">
            <Move className="size-4 text-primary animate-pulse shrink-0" />
            <span className="text-xs font-semibold">Rearranging Layout</span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline ml-2">
              Drag headers to move, drag bottom-right corner handles to resize.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleResetLayout} className="h-7 text-xs">
              Reset
            </Button>
            <Button size="sm" onClick={() => setIsArranging(false)} className="h-7 text-xs">
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Grid container */}
      <div className="relative">
        {mounted && initialized && (
          <ResponsiveGridLayout
            className={`layout -mx-4 ${isArranging ? "layout-customizing" : ""}`}
            layouts={{ lg: visibleItems }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={80}
            isDraggable={isArranging}
            isResizable={isArranging}
            draggableHandle=".drag-handle"
            onLayoutChange={(currentLayout) => {
              if (isArranging) {
                updateLayout(ws, currentLayout);
              }
            }}
            margin={[16, 16]}
            containerPadding={[16, 0]}
          >
            {visibleItems.map((item) => {
              const widgetDef = WIDGET_REGISTRY.find((w) => w.id === item.i);
              const label = widgetDef?.label ?? "Widget";

              return (
                <div key={item.i} className="w-full h-full">
                  <WidgetShell
                    id={item.i}
                    label={label}
                    isEditing={isArranging}
                    onHide={() => toggleWidget(ws, item.i)}
                  >
                    {(() => {
                      switch (item.i) {
                        case "stat_total_hours":
                          return (
                            <div className="flex flex-col justify-center h-full">
                              <span className="text-2xl font-bold tracking-tight text-foreground">
                                {weekStats.totalHours}h
                              </span>
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1.5">
                                {weekStats.billableHours}h billable
                              </span>
                            </div>
                          );
                        case "stat_billable":
                          return (
                            <div className="flex flex-col justify-center h-full">
                              <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                                {weekStats.billableHours}h
                              </span>
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1.5">
                                {weekStats.totalHours > 0
                                  ? Math.round(
                                      (weekStats.billableHours / weekStats.totalHours) * 100
                                    )
                                  : 0}
                                % of weekly total
                              </span>
                            </div>
                          );
                        case "stat_projects":
                          return (
                            <div className="flex flex-col justify-center h-full">
                              <span className="text-2xl font-bold tracking-tight text-foreground">
                                {weekStats.assignedProjects}
                              </span>
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1.5">
                                Assigned projects
                              </span>
                            </div>
                          );
                        case "weekly_progress":
                          return <WeeklyProgressWidget logs={logs} />;
                        case "project_split":
                          return (
                            <ProjectSplitWidget logs={logs} projects={projects} tasks={tasks} />
                          );
                        case "pinned_favorites":
                          return (
                            <QuickActions
                              onSelect={handleQuickSelect}
                              currentProjectId={projectId}
                              currentTaskId={taskChoice}
                              mode="favorites"
                            />
                          );
                        case "recent_activity":
                          return (
                            <QuickActions
                              onSelect={handleQuickSelect}
                              currentProjectId={projectId}
                              currentTaskId={taskChoice}
                              mode="recents"
                            />
                          );
                        case "today_logs":
                          return (
                            <TodayLogsWidget
                              logs={logs}
                              projects={projects}
                              tasks={tasks}
                              onDeleteLog={handleDeleteLog}
                              onResumeTask={handleResumeTask}
                            />
                          );
                        case "timesheet_submissions":
                          return (
                            <TimesheetSubmissionsWidget
                              submissions={submissions}
                              projects={projects}
                            />
                          );
                        case "daily_progress":
                          return (
                            <div className="flex h-full items-center justify-center py-2">
                              <DailyGoalWidget totalSeconds={totalTodaySec} cardless />
                            </div>
                          );
                        case "quick_timer":
                          return (
                            <div className="flex flex-col justify-between h-full min-h-[140px] text-xs gap-3">
                              {tracking ? (
                                <div className="space-y-3 flex-1 flex flex-col justify-between">
                                  {/* Left/Right clock layout */}
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                      <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
                                        Active Tracking
                                      </span>
                                      {activeProject && activeTask && (
                                        <div className="flex items-center gap-1.5 mt-1 font-semibold truncate">
                                          <ProjectColorDot color={activeProject.color} size="sm" />
                                          <span className="truncate">{activeProject.name}</span>
                                          <span className="text-muted-foreground font-normal">
                                            &bull;
                                          </span>
                                          <span className="text-muted-foreground truncate font-normal">
                                            {activeTask.taskName}
                                          </span>
                                        </div>
                                      )}
                                      <div className="mt-2">
                                        <Input
                                          value={stopDescription}
                                          onChange={(e) => setStopDescription(e.target.value)}
                                          placeholder="Note (optional)"
                                          className="h-7 text-xs bg-background/50"
                                        />
                                      </div>
                                    </div>
                                    <div className="font-mono text-xl font-bold tabular-nums shrink-0 bg-muted/40 px-3 py-2 rounded-lg border border-border/40">
                                      {formatElapsed(elapsedSec)}
                                    </div>
                                  </div>

                                  {/* Action Buttons Row */}
                                  <div className="flex gap-2">
                                    {isPaused ? (
                                      <Button
                                        onClick={resumeTimer}
                                        disabled={resuming}
                                        className="h-8 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                      >
                                        <Play className="size-3 mr-1 fill-current" />
                                        Resume
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        onClick={pauseTimer}
                                        disabled={pausing}
                                        className="h-8 text-xs flex-1 border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                                      >
                                        <Pause className="size-3 mr-1" />
                                        Pause
                                      </Button>
                                    )}
                                    <Button
                                      variant="destructive"
                                      onClick={stopTimer}
                                      disabled={stopping}
                                      className="h-8 text-xs flex-1"
                                    >
                                      <Square className="size-3 mr-1 fill-current" />
                                      Stop
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3 flex-1 flex flex-col justify-between">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-muted-foreground">
                                        Project
                                      </Label>
                                      <Select value={projectId} onValueChange={setProjectId}>
                                        <SelectTrigger className="h-8 bg-background text-xs">
                                          <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {projects.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                              <span className="flex items-center gap-1.5 text-xs">
                                                <ProjectColorDot color={p.color} size="sm" />
                                                {p.name}
                                              </span>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-muted-foreground">
                                        Task
                                      </Label>
                                      <Select
                                        value={taskChoice}
                                        onValueChange={(v) => {
                                          setTaskChoice(v);
                                          setIsBillable(suggestBillableFromTask(tasks, v));
                                        }}
                                        disabled={!projectId}
                                      >
                                        <SelectTrigger className="h-8 bg-background text-xs">
                                          <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {projectTasks.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                              <span className="text-xs">{t.taskName}</span>
                                            </SelectItem>
                                          ))}
                                          <SelectItem value={NEW_TASK} className="text-xs">
                                            + Create task
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  {taskChoice === NEW_TASK && (
                                    <div className="space-y-1">
                                      <Input
                                        value={newTaskName}
                                        onChange={(e) => setNewTaskName(e.target.value)}
                                        placeholder="New task name"
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                  )}

                                  <Button
                                    onClick={startTimer}
                                    disabled={!canStart || starting}
                                    className="h-8 w-full text-xs"
                                  >
                                    <Play className="size-3 mr-1 fill-current" />
                                    Start tracking
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        default:
                          return null;
                      }
                    })()}
                  </WidgetShell>
                </div>
              );
            })}
          </ResponsiveGridLayout>
        )}
      </div>
    </div>
  );
}
