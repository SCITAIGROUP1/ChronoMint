"use client";

import {
  AppBar,
  AppBarActionButton,
  Badge,
  Button,
  Card,
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
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatWeekSectionLabel, groupLogsByWeek } from "./group-logs-by-week";
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
import { useTimeTrackerLogs } from "./use-time-tracker-logs";
import { todayInZone, toTimeValueInZone } from "@/features/timesheet/calendar-utils";
import {
  canSaveTaskDraft,
  draftFromSlot,
  draftToIsoRange,
  type TimeEntryDraft
} from "@/features/timesheet/time-entry-draft";
import { TimeEntryDialog } from "@/features/timesheet/timesheet-lazy";
import { validateTimeEntryOverlap } from "@/features/timesheet/validate-time-entry-overlap";
import { useIsImpersonating } from "@/hooks/use-is-impersonating";
import { useSessionStore } from "@/stores/session.store";

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
  const [entryDraft, setEntryDraft] = useState<TimeEntryDraft | null>(null);
  const [entrySaving, setEntrySaving] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

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
  const groups = useMemo(
    () => groupLogsByWeek(logs, timezone, weekStart),
    [logs, timezone, weekStart]
  );
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects]
  );
  const activeFilterCount =
    Number(Boolean(categoryId)) + Number(Boolean(taskId)) + Number(billability !== "all");

  function openEntryDialog() {
    const day = todayInZone(timezone);
    const [zonedHour = "09", zonedMinute = "00"] = toTimeValueInZone(new Date(), timezone).split(
      ":"
    );
    const startHour = Number(zonedHour);
    const startMinute = startHour === 23 ? 0 : Number(zonedMinute) < 30 ? 0 : 30;
    setEntryDraft(draftFromSlot(day, startHour, startMinute, timezone));
    setEntryError(null);
    setEntryDialogOpen(true);
  }

  function closeEntryDialog() {
    setEntryDialogOpen(false);
    setEntryDraft(null);
    setEntryError(null);
  }

  async function saveEntry() {
    if (isImpersonating || !entryDraft || !canSaveTaskDraft(entryDraft)) {
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
      timezone
    );
    if (overlap) {
      setEntryError(overlap);
      return;
    }

    setEntrySaving(true);
    setEntryError(null);
    try {
      if (entryDraft.recurrence && entryDraft.recurrence !== "none") {
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
        await timelogMutations.create({
          taskId: entryDraft.taskSelection,
          startTime,
          endTime,
          description: entryDraft.description || undefined,
          isBillable: entryDraft.isBillable
        });
      }
      closeEntryDialog();
      toast.success("Time entry created!");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Could not save entry";
      setEntryError(message);
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
        title="Log time"
        draft={entryDraft}
        projects={projects}
        tasks={tasks}
        categories={categories}
        taskLabel={(id) => tasks.find((task) => task.id === id)?.taskName ?? "Unknown task"}
        saving={entrySaving}
        error={entryError}
        readOnly={isImpersonating}
        timezone={timezone}
        onClose={closeEntryDialog}
        onDraftChange={setEntryDraft}
        onSave={() => void saveEntry()}
      />
      <TimeTrackerStatCards stats={stats} loading={loading || search.trim() !== debouncedSearch} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="space-y-4">
        {groups.length === 0 && !loading ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No time entries in this range.
          </Card>
        ) : null}
        {groups.map((group) => (
          <Card key={group.weekKey} className="overflow-hidden p-0">
            <div className="border-b bg-muted/20 px-4 py-3">
              <p className="font-semibold">{formatWeekSectionLabel(group.weekStart, timezone)}</p>
            </div>
            {group.logs.map((log) => {
              const task = taskById.get(log.taskId);
              const project = task ? projectById.get(task.projectId) : undefined;
              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between border-b px-4 py-3 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{project?.name ?? "Unknown project"}</p>
                    <p className="text-xs text-muted-foreground">
                      {[task?.taskName, log.description].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="text-sm tabular-nums">
                    {(log.durationSec / 3600).toFixed(2)}h
                  </span>
                </div>
              );
            })}
          </Card>
        ))}
      </div>
    </div>
  );
}
