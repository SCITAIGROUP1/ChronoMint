"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@chronomint/ui";
import { ROUTES } from "@chronomint/contracts";
import type { TimeLogDto, TaskDto, ProjectDto } from "@chronomint/contracts";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";
import { useTimesheetStore } from "@/stores/timesheet.store";
import { useProjectsStore } from "@/stores/projects.store";
import { formatTaskLabel } from "@/lib/project-labels";
import { colorForTask } from "@/lib/project-color-styles";
import { ProjectColorDot } from "@chronomint/ui";
import { TimesheetCalendar } from "./timesheet-calendar";
import { TimesheetMonth } from "./timesheet-month";
import {
  TimeEntryDialog,
  NEW_TASK,
  canSaveTaskDraft,
  draftFromLog,
  draftFromSlot,
  draftFromSlotRange,
  draftToIsoRange,
  type TimeEntryDraft
} from "./time-entry-dialog";
import { MyWeekSummary } from "@/components/my-week-summary";
import { TimesheetExport } from "@/components/timesheet-export";
import {
  addDays,
  addMonths,
  endOfMonth,
  formatDuration,
  formatMonthYear,
  formatWeekRange,
  getWeekDays,
  startOfMonth,
  startOfWeek,
  startOfDay
} from "./calendar-utils";

type ViewMode = "day" | "week" | "month" | "list";

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildLogsQuery(from: Date, to: Date): string {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString()
  });
  return `${ROUTES.TIMELOGS.LIST}?${params}`;
}

export function TimesheetPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { logs, setLogs } = useTimesheetStore();
  const { tasks, projects, workspaceNamesById, setTasks, setProjects } = useProjectsStore();

  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<TimeLogDto | null>(null);
  const [draft, setDraft] = useState<TimeEntryDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);
  const monthStart = useMemo(() => startOfMonth(anchor), [anchor]);

  const calendarDays = useMemo(() => {
    if (view === "day") return [startOfDay(anchor)];
    if (view === "week") return getWeekDays(weekStart);
    return [];
  }, [view, anchor, weekStart]);

  const visibleRange = useMemo(() => {
    if (view === "day") {
      const from = startOfDay(anchor);
      return { from, to: addDays(from, 1) };
    }
    if (view === "week") {
      return { from: weekStart, to: addDays(weekStart, 7) };
    }
    if (view === "month") {
      const from = startOfMonth(anchor);
      return { from, to: addDays(endOfMonth(anchor), 1) };
    }
    return null;
  }, [view, anchor, weekStart]);

  const rangeLabel = useMemo(() => {
    if (view === "day") {
      return anchor.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      });
    }
    if (view === "week") return formatWeekRange(weekStart);
    if (view === "month") return formatMonthYear(monthStart);
    return "All entries";
  }, [view, anchor, weekStart, monthStart]);

  const taskLabel = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return "Unknown task";
      const project = projects.find((p) => p.id === task.projectId);
      return formatTaskLabel(project, task.taskName, workspaceNamesById);
    },
    [tasks, projects, workspaceNamesById]
  );

  const entryColor = useCallback(
    (taskId: string) => colorForTask(taskId, tasks, projects),
    [tasks, projects]
  );

  const refreshLogs = useCallback(async () => {
    if (visibleRange) {
      setLogs(
        await api<TimeLogDto[]>(buildLogsQuery(visibleRange.from, visibleRange.to), {
          workspaceId: ws
        })
      );
    } else {
      setLogs(await api<TimeLogDto[]>(ROUTES.TIMELOGS.LIST, { workspaceId: ws }));
    }
  }, [ws, setLogs, visibleRange]);

  useEffect(() => {
    if (!ws) return;
    void refreshLogs();
  }, [ws, refreshLogs]);

  useEffect(() => {
    if (!ws) return;
    api<TaskDto[]>(ROUTES.TASKS.LIST, { workspaceId: ws }).then(setTasks);
    api<ProjectDto[]>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects);
  }, [ws, setTasks, setProjects]);

  function goToday() {
    setAnchor(startOfDay(new Date()));
  }

  function goPrev() {
    if (view === "month") setAnchor((d) => addMonths(d, -1));
    else if (view === "day") setAnchor((d) => addDays(d, -1));
    else setAnchor((d) => addDays(d, -7));
  }

  function goNext() {
    if (view === "month") setAnchor((d) => addMonths(d, 1));
    else if (view === "day") setAnchor((d) => addDays(d, 1));
    else setAnchor((d) => addDays(d, 7));
  }

  function openDraft(next: TimeEntryDraft, log: TimeLogDto | null = null) {
    setEditingLog(log);
    setDraft(next);
    setError(null);
    setDialogOpen(true);
  }

  function openCreateSlot(day: Date, hour: number, minute: number) {
    openDraft(draftFromSlot(day, hour, minute));
  }

  function openCreateRange(day: Date, startIndex: number, endIndex: number) {
    openDraft(draftFromSlotRange(day, startIndex, endIndex));
  }

  function openEditEntry(log: TimeLogDto) {
    openDraft(draftFromLog(log, tasks), log);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingLog(null);
    setDraft(null);
    setError(null);
  }

  async function resolveTaskId(d: TimeEntryDraft): Promise<string | null> {
    if (d.taskSelection === NEW_TASK) {
      const created = await api<TaskDto>(ROUTES.TASKS.CREATE, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ projectId: d.projectId, taskName: d.newTaskName.trim() })
      });
      const all = await api<TaskDto[]>(ROUTES.TASKS.LIST, { workspaceId: ws });
      setTasks(all);
      return created.id;
    }
    return d.taskSelection || null;
  }

  async function saveEntry() {
    if (!draft || !canSaveTaskDraft(draft)) {
      setError("Select a project and task (or create a new one).");
      return;
    }
    const { startTime, endTime } = draftToIsoRange(draft);
    if (new Date(endTime) <= new Date(startTime)) {
      setError("End time must be after start time.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const taskId = await resolveTaskId(draft);
      if (!taskId) {
        setError("Select a task to log time.");
        return;
      }
      const body = {
        taskId,
        startTime,
        endTime,
        description: draft.description || undefined,
        isBillable: draft.isBillable
      };
      if (editingLog) {
        await api(`/timelogs/${editingLog.id}`, {
          method: "PATCH",
          workspaceId: ws,
          body: JSON.stringify(body)
        });
      } else {
        await api(ROUTES.TIMELOGS.CREATE, {
          method: "POST",
          workspaceId: ws,
          body: JSON.stringify(body)
        });
      }
      await refreshLogs();
      closeDialog();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save entry");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(log?: TimeLogDto) {
    const target = log ?? editingLog;
    if (!target) return;
    if (!window.confirm("Delete this time entry?")) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/timelogs/${target.id}`, { method: "DELETE", workspaceId: ws });
      await refreshLogs();
      if (editingLog?.id === target.id) closeDialog();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete entry");
    } finally {
      setSaving(false);
    }
  }

  async function duplicateEntry(log: TimeLogDto, start: Date, end: Date) {
    if (end <= start) return;
    setError(null);
    try {
      const created = await api<TimeLogDto>(ROUTES.TIMELOGS.CREATE, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          taskId: log.taskId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          description: log.description ?? undefined,
          isBillable: log.isBillable
        })
      });
      await refreshLogs();
      openDraft(draftFromLog(created, tasks), created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not duplicate entry");
    }
  }

  async function updateEntryTimes(log: TimeLogDto, start: Date, end: Date, errorLabel: string) {
    if (end <= start) return;
    setError(null);
    try {
      await api(`/timelogs/${log.id}`, {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify({
          startTime: start.toISOString(),
          endTime: end.toISOString()
        })
      });
      await refreshLogs();
    } catch (e) {
      setError(e instanceof Error ? e.message : errorLabel);
    }
  }

  const resizeEntry = (log: TimeLogDto, start: Date, end: Date) =>
    updateEntryTimes(log, start, end, "Could not resize entry");

  const moveEntry = (log: TimeLogDto, start: Date, end: Date) =>
    updateEntryTimes(log, start, end, "Could not move entry");

  function onMonthDayClick(day: Date) {
    setAnchor(startOfDay(day));
    setView("day");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Timesheet</h1>
          <p className="text-sm text-muted-foreground">
            Drag slots, drag blocks to move, resize edges, Ctrl+drag to duplicate.
          </p>
        </div>
        <div className="flex rounded-lg border border-border p-0.5">
          {(["day", "week", "month", "list"] as const).map((mode) => (
            <Button
              key={mode}
              type="button"
              size="sm"
              variant={view === mode ? "default" : "ghost"}
              className="capitalize"
              onClick={() => setView(mode)}
            >
              {mode}
            </Button>
          ))}
        </div>
      </div>

      {view !== "list" && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={goPrev}>
              ‹
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={goNext}>
              ›
            </Button>
          </div>
          <span className="text-sm font-medium">{rangeLabel}</span>
        </div>
      )}

      {error && !dialogOpen && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <MyWeekSummary />
        <TimesheetExport
          defaultFrom={
            visibleRange ? toDateInputValue(visibleRange.from) : undefined
          }
          defaultTo={
            visibleRange
              ? toDateInputValue(new Date(visibleRange.to.getTime() - 1))
              : undefined
          }
        />
      </div>

      {view === "list" ? (
        <Card>
          <CardHeader>
            <CardTitle>All entries</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No entries yet. Use the calendar to log time.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Billable</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="max-w-[240px]">
                        <span className="flex items-center gap-2 truncate">
                          <ProjectColorDot color={entryColor(log.taskId)} />
                          <span className="truncate">{taskLabel(log.taskId)}</span>
                        </span>
                      </TableCell>
                      <TableCell>{new Date(log.startTime).toLocaleString()}</TableCell>
                      <TableCell>{new Date(log.endTime).toLocaleString()}</TableCell>
                      <TableCell>{formatDuration(log.durationSec)}</TableCell>
                      <TableCell>{log.isBillable ? "Yes" : "No"}</TableCell>
                      <TableCell>{log.source}</TableCell>
                      <TableCell className="space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditEntry(log)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void deleteEntry(log)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : view === "month" ? (
        <TimesheetMonth
          month={monthStart}
          logs={logs}
          entryColor={entryColor}
          onDayClick={onMonthDayClick}
        />
      ) : (
        <TimesheetCalendar
          view={view}
          days={calendarDays}
          logs={logs}
          taskName={(id) => taskLabel(id)}
          entryColor={entryColor}
          onSlotClick={openCreateSlot}
          onSlotRangeSelect={openCreateRange}
          onEntryClick={openEditEntry}
          onEntryResize={resizeEntry}
          onEntryMove={moveEntry}
          onEntryDuplicate={duplicateEntry}
        />
      )}

      <TimeEntryDialog
        open={dialogOpen}
        title={editingLog ? "Edit time entry" : "Log time"}
        draft={draft}
        projects={projects}
        tasks={tasks}
        taskLabel={taskLabel}
        workspaceNames={workspaceNamesById}
        editingLog={editingLog}
        saving={saving}
        error={error}
        onClose={closeDialog}
        onDraftChange={setDraft}
        onSave={saveEntry}
        onDelete={editingLog ? deleteEntry : undefined}
      />
    </div>
  );
}
