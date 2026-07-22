"use client";

import type { TimeLogDto } from "@kloqra/contracts";
import {
  AppBar,
  AppBarActionButton,
  Badge,
  Button,
  ConfirmDialog,
  DateRangePicker,
  Input,
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@kloqra/ui";
import {
  logStartDateKey,
  useDisplayPreferences,
  useEntryCatalogQueries,
  useTimesheetSubmissionStatusQuery,
  useTimelogMutations
} from "@kloqra/web-shared";
import { Download, Filter, Plus, Search, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  isTimeEntryInactive,
  isTimeEntryLocked,
  LOCKED_ENTRY_MESSAGE
} from "./entry-approval-status";
import { buildWeekGroupsForRange } from "./group-logs-by-week";
import { TimeTrackerExportModal } from "./time-tracker-export-modal";
import { TimeTrackerFiltersPanel, type BillabilityFilter } from "./time-tracker-filters-panel";
import { TimeTrackerImportModal } from "./time-tracker-import-modal";
import {
  inclusiveDateKeysFromPeriod,
  matchTimeTrackerPeriod,
  periodLabelForSelection,
  resolveTimeTrackerDateRange,
  TIME_TRACKER_PERIOD_LABELS,
  TIME_TRACKER_PERIOD_PRESETS,
  type TimeTrackerPeriodSelection
} from "./time-tracker-period";
import { TimeTrackerStatCards } from "./time-tracker-stat-cards";
import { computeTimeTrackerStats } from "./time-tracker-stats";
import { formatVisibleWeeksSummary, TimeTrackerWeekList } from "./time-tracker-week-list";
import { useTimeTrackerLogs } from "./use-time-tracker-logs";
import { todayInZone, toTimeValueInZone } from "@/features/timesheet/calendar-utils";
import {
  canSaveTaskDraft,
  draftFromLog,
  draftFromSlot,
  draftToIsoRange,
  type TimeEntryDraft
} from "@/features/timesheet/time-entry-draft";
import { TimeEntryDialog } from "@/features/timesheet/timesheet-lazy";
import { validateTimeEntryOverlap } from "@/features/timesheet/validate-time-entry-overlap";
import { useIsImpersonating } from "@/hooks/use-is-impersonating";
import { colorForTask } from "@/lib/project-color-styles";
import { useSessionStore } from "@/stores/session.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";

function browserTimezone() {
  return typeof Intl === "undefined" ? "UTC" : Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function PersonalTimeTrackerPage() {
  const workspaceId = useSessionStore((state) => state.session?.workspaceId ?? "");
  const isImpersonating = useIsImpersonating();
  const { timezone, weekStart } = useDisplayPreferences();
  const { projects, tasks, categories } = useEntryCatalogQueries(workspaceId, {
    enabled: Boolean(workspaceId)
  });
  const workspaces = useWorkspacesStore((state) => state.workspaces);
  const workspaceNamesById = useMemo(
    () => Object.fromEntries(workspaces.map((workspace) => [workspace.id, workspace.name])),
    [workspaces]
  );
  const initial = inclusiveDateKeysFromPeriod("this_week", browserTimezone());
  const [period, setPeriod] = useState<TimeTrackerPeriodSelection>("this_week");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [projectId, setProjectId] = useState("all");
  const [categoryId, setCategoryId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [billability, setBillability] = useState<BillabilityFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<TimeLogDto | null>(null);
  const [entryDraft, setEntryDraft] = useState<TimeEntryDraft | null>(null);
  const [entrySaving, setEntrySaving] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [confirmDeleteLog, setConfirmDeleteLog] = useState<TimeLogDto | null>(null);
  const [weeksPerPage, setWeeksPerPage] = useState(1);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (period === "custom") return;
    const range = inclusiveDateKeysFromPeriod(period, timezone, weekStart);
    setFrom(range.from);
    setTo(range.to);
  }, [period, timezone, weekStart]);

  const visibleRange = useMemo(
    () => resolveTimeTrackerDateRange(from, to, timezone),
    [from, to, timezone]
  );
  const filters = useMemo(
    () => ({
      from: visibleRange.from,
      to: visibleRange.to,
      projectId: projectId === "all" ? undefined : [projectId],
      categoryId: categoryId || undefined,
      taskId: taskId || undefined,
      search: debouncedSearch || undefined,
      billableOnly: billability === "billable" || undefined
    }),
    [visibleRange, projectId, categoryId, taskId, debouncedSearch, billability]
  );
  const { logs, listPath, loading, error, refresh } = useTimeTrackerLogs(workspaceId, filters);
  const timelogMutations = useTimelogMutations(workspaceId, {
    onLocalRefresh: refresh,
    listPaths: [listPath]
  });
  const submissionDates = useMemo(() => {
    const dates = new Set(logs.map((log) => logStartDateKey(log, timezone)));
    return [...dates];
  }, [logs, timezone]);
  const { submissionByKey } = useTimesheetSubmissionStatusQuery(
    workspaceId,
    submissionDates,
    Boolean(workspaceId),
    timezone
  );
  const periodLabel = periodLabelForSelection(period, from, to, timezone);
  const stats = computeTimeTrackerStats(logs, periodLabel, projects, tasks, submissionByKey);
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects]
  );

  const filterResetKey = useMemo(
    () =>
      JSON.stringify({
        from: visibleRange.from.toISOString(),
        to: visibleRange.to.toISOString(),
        projectId: projectId === "all" ? "" : projectId,
        categoryId,
        taskId,
        search: debouncedSearch,
        billableOnly: billability === "billable"
      }),
    [visibleRange, projectId, categoryId, taskId, debouncedSearch, billability]
  );

  useEffect(() => {
    setPage(1);
  }, [filterResetKey]);

  const allWeekGroups = useMemo(
    () => buildWeekGroupsForRange(from, to, logs, timezone, weekStart),
    [from, to, logs, timezone, weekStart]
  );
  const totalWeekCount = allWeekGroups.length;
  const totalWeekPages = Math.max(1, Math.ceil(totalWeekCount / weeksPerPage));

  useEffect(() => {
    if (page > totalWeekPages) setPage(totalWeekPages);
  }, [page, totalWeekPages]);

  const visibleWeekGroups = useMemo(() => {
    const start = (page - 1) * weeksPerPage;
    return allWeekGroups.slice(start, start + weeksPerPage);
  }, [allWeekGroups, page, weeksPerPage]);

  const weekTotals = useMemo(() => {
    const map = new Map<string, { totalSec: number; billableSec: number }>();
    for (const group of allWeekGroups) {
      map.set(group.weekKey, { totalSec: group.totalSec, billableSec: group.billableSec });
    }
    return map;
  }, [allWeekGroups]);

  const weekRangeSummary = useMemo(
    () => formatVisibleWeeksSummary(visibleWeekGroups, timezone),
    [visibleWeekGroups, timezone]
  );

  const setWeeksPerPageAndResetPage = useCallback((next: number) => {
    setWeeksPerPage(next);
    setPage(1);
  }, []);

  const entryColor = useCallback(
    (id: string) => colorForTask(id, tasks, projects),
    [tasks, projects]
  );

  function isEntryReadOnly(log: TimeLogDto): boolean {
    const task = taskById.get(log.taskId);
    const project = task ? projectById.get(task.projectId) : undefined;
    const category = task?.categoryId ? categoryById.get(task.categoryId) : undefined;
    return (
      isTimeEntryLocked(log, project, submissionByKey) ||
      isTimeEntryInactive(project, task, category)
    );
  }

  const activeFilterCount =
    Number(Boolean(categoryId)) + Number(Boolean(taskId)) + Number(billability !== "all");

  function openDraft(next: TimeEntryDraft, log: TimeLogDto | null = null) {
    setEditingLog(log);
    setEntryDraft(next);
    setEntryError(null);
    setEntryDialogOpen(true);
  }

  function openEntryDialog() {
    if (isImpersonating) return;
    const day = todayInZone(timezone);
    const [zonedHour = "09", zonedMinute = "00"] = toTimeValueInZone(new Date(), timezone).split(
      ":"
    );
    const startHour = Number(zonedHour);
    const startMinute = startHour === 23 ? 0 : Number(zonedMinute) < 30 ? 0 : 30;
    openDraft(draftFromSlot(day, startHour, startMinute, timezone));
  }

  function openEditEntry(log: TimeLogDto) {
    openDraft(draftFromLog(log, tasks, timezone), log);
  }

  function closeEntryDialog() {
    setEntryDialogOpen(false);
    setEditingLog(null);
    setEntryDraft(null);
    setEntryError(null);
  }

  async function saveEntry() {
    if (isImpersonating) return;
    if (editingLog && isEntryReadOnly(editingLog)) return;
    if (!entryDraft || !canSaveTaskDraft(entryDraft)) {
      setEntryError("Select a project and a task.");
      return;
    }
    const { startTime, endTime } = draftToIsoRange(entryDraft, timezone);
    if (new Date(endTime) <= new Date(startTime)) {
      setEntryError("End time must be after start time.");
      return;
    }
    const overlap = await validateTimeEntryOverlap(
      workspaceId,
      new Date(startTime),
      new Date(endTime),
      timezone,
      editingLog?.id
    );
    if (overlap) {
      setEntryError(overlap);
      return;
    }

    setEntrySaving(true);
    setEntryError(null);
    try {
      if (!editingLog && entryDraft.recurrence && entryDraft.recurrence !== "none") {
        if (!entryDraft.repeatUntil) {
          setEntryError("Please select an end date for the recurrence.");
          return;
        }
        await timelogMutations.createBatch({
          taskId: entryDraft.taskSelection,
          localStartTime: entryDraft.startTime,
          localEndTime: entryDraft.endTime,
          startDate: entryDraft.date,
          endDate: entryDraft.repeatUntil,
          recurrence: entryDraft.recurrence,
          timezone,
          description: entryDraft.description || undefined,
          isBillable: entryDraft.isBillable
        });
      } else {
        const body = {
          taskId: entryDraft.taskSelection,
          startTime,
          endTime,
          description: entryDraft.description || undefined,
          isBillable: entryDraft.isBillable
        };
        if (editingLog) {
          await timelogMutations.update(editingLog.id, body);
        } else {
          await timelogMutations.create(body);
        }
      }
      closeEntryDialog();
      toast.success(editingLog ? "Time entry updated!" : "Time entry created!");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Could not save entry";
      setEntryError(message);
      toast.error(message);
    } finally {
      setEntrySaving(false);
    }
  }

  function deleteEntry(log: TimeLogDto) {
    if (isImpersonating) return;
    if (isEntryReadOnly(log)) {
      toast.error(LOCKED_ENTRY_MESSAGE);
      return;
    }
    setConfirmDeleteLog(log);
  }

  async function confirmDelete() {
    if (isImpersonating) return;
    const target = confirmDeleteLog;
    setConfirmDeleteLog(null);
    if (!target) return;
    if (isEntryReadOnly(target)) {
      toast.error(LOCKED_ENTRY_MESSAGE);
      return;
    }
    setEntrySaving(true);
    try {
      await timelogMutations.remove(target.id);
      if (editingLog?.id === target.id) closeEntryDialog();
      toast.success("Time entry deleted!");
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Could not delete entry";
      toast.error(message);
    } finally {
      setEntrySaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <AppBar
        title="Time Tracker"
        description="View, filter, import, export, and manage your own time entries."
        actions={
          <>
            <AppBarActionButton onClick={() => setExportOpen(true)}>
              <Download className="size-4" /> Export
            </AppBarActionButton>
            {!isImpersonating ? (
              <AppBarActionButton onClick={() => setImportOpen(true)}>
                <Upload className="size-4" /> Import
              </AppBarActionButton>
            ) : null}
          </>
        }
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search entries..."
              className="pl-9"
            />
          </div>
          <SearchableSelect
            value={projectId}
            onValueChange={(value) => {
              setProjectId(value);
              setTaskId("");
            }}
            options={[
              { value: "all", label: "All Projects" },
              ...projects.map((project) => ({ value: project.id, label: project.name }))
            ]}
            placeholder="All Projects"
            aria-label="Filter by project"
            className="w-[190px]"
          />
          <Select
            value={period}
            onValueChange={(value) => setPeriod(value as TimeTrackerPeriodSelection)}
          >
            <SelectTrigger className="w-[170px]" aria-label="Time period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_TRACKER_PERIOD_PRESETS.map((value) => (
                <SelectItem key={value} value={value}>
                  {TIME_TRACKER_PERIOD_LABELS[value]}
                </SelectItem>
              ))}
              <SelectItem value="custom">{TIME_TRACKER_PERIOD_LABELS.custom}</SelectItem>
            </SelectContent>
          </Select>
          <DateRangePicker
            from={from}
            to={to}
            onChange={(nextFrom, nextTo) => {
              setFrom(nextFrom);
              setTo(nextTo);
              setPeriod(matchTimeTrackerPeriod(nextFrom, nextTo, timezone, weekStart));
            }}
            weekStartsOn={weekStart === "sunday" ? 0 : 1}
            ariaLabel="Date range"
            className="w-[260px]"
          />
          <Button variant="outline" onClick={() => setFiltersOpen((open) => !open)}>
            <Filter className="size-4" /> Filters
            {activeFilterCount ? <Badge>{activeFilterCount}</Badge> : null}
          </Button>
          {!isImpersonating ? (
            <Button type="button" onClick={openEntryDialog}>
              <Plus className="size-4" /> Add Entry
            </Button>
          ) : null}
        </div>
        {filtersOpen ? (
          <TimeTrackerFiltersPanel
            values={{ categoryId, taskId, billability }}
            categories={categories}
            tasks={tasks}
            projectId={projectId === "all" ? [] : [projectId]}
            onCategoryChange={setCategoryId}
            onTaskChange={setTaskId}
            onBillabilityChange={setBillability}
            onClear={() => {
              setCategoryId("");
              setTaskId("");
              setBillability("all");
            }}
          />
        ) : null}
      </div>

      <TimeTrackerExportModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        defaultFrom={from}
        defaultTo={to}
        defaultProjectId={projectId}
      />
      <TimeTrackerImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => void refresh()}
      />
      <TimeEntryDialog
        open={entryDialogOpen}
        title={editingLog ? "Edit time entry" : "Log time"}
        draft={entryDraft}
        projects={projects}
        tasks={tasks}
        categories={categories}
        taskLabel={(id) => tasks.find((task) => task.id === id)?.taskName ?? "Unknown task"}
        editingLog={editingLog}
        saving={entrySaving}
        error={entryError}
        readOnly={isImpersonating || (editingLog ? isEntryReadOnly(editingLog) : false)}
        timezone={timezone}
        workspaceId={workspaceId}
        onClose={closeEntryDialog}
        onDraftChange={setEntryDraft}
        onSave={() => void saveEntry()}
        onDelete={
          !isImpersonating && editingLog && !isEntryReadOnly(editingLog)
            ? () => deleteEntry(editingLog)
            : undefined
        }
      />
      <ConfirmDialog
        open={Boolean(confirmDeleteLog)}
        title="Delete time entry?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => void confirmDelete()}
        onCancel={() => setConfirmDeleteLog(null)}
      />

      <TimeTrackerStatCards stats={stats} loading={loading || search.trim() !== debouncedSearch} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <TimeTrackerWeekList
        groups={visibleWeekGroups}
        weekTotals={weekTotals}
        tasks={tasks}
        projects={projects}
        workspaceNamesById={workspaceNamesById}
        submissionByKey={submissionByKey}
        entryColor={entryColor}
        isEntryLocked={(log) => {
          const task = taskById.get(log.taskId);
          const project = task ? projectById.get(task.projectId) : undefined;
          return isTimeEntryLocked(log, project, submissionByKey);
        }}
        isEntryInactive={(log) => {
          const task = taskById.get(log.taskId);
          const project = task ? projectById.get(task.projectId) : undefined;
          const category = task?.categoryId ? categoryById.get(task.categoryId) : undefined;
          return isTimeEntryInactive(project, task, category);
        }}
        onEdit={openEditEntry}
        onDelete={deleteEntry}
        timezone={timezone}
        weekStartPref={weekStart}
        rangeFrom={from}
        rangeTo={to}
        loading={loading || search.trim() !== debouncedSearch}
        page={page}
        weeksPerPage={weeksPerPage}
        onWeeksPerPageChange={setWeeksPerPageAndResetPage}
        onPageChange={setPage}
        totalWeekPages={totalWeekPages}
        totalWeekCount={totalWeekCount}
        weekRangeSummary={weekRangeSummary}
        readOnly={isImpersonating}
      />
    </div>
  );
}
