"use client";

import type {
  TimeLogDto,
  TaskDto,
  ProjectDto,
  CategoryDto,
  ListTimelogAuditEventsResponseDto,
  JiraIssueDto
} from "@kloqra/contracts";
import { ROUTES } from "@kloqra/contracts";
import {
  AppModal,
  Button,
  ConfirmDialog,
  Input,
  Label,
  ProjectColorDot,
  SearchableSelect,
  TimeEntryAuditTrail,
  DatePicker,
  cn
} from "@kloqra/ui";
import {
  buildTaskSelectGroups,
  extractFieldErrorsFromMessage,
  prioritizeByFavoriteIds,
  useCategoriesListQuery,
  useEntryFavorites,
  useSessionStore,
  useTimelogOccupancyQuery
} from "@kloqra/web-shared";
import { AlertTriangle, ChevronDown, Clock } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDurationToStartTime,
  applyDurationToDraft,
  durationSecFromStartEnd,
  formatDurationInput,
  parseDurationInput
} from "./parse-duration-input";
import { RepeatEntryPanel } from "./repeat-entry-panel";
import {
  type TimeEntryDraft,
  canSaveTaskDraft,
  draftToIsoRange,
  suggestBillableFromTask,
  taskSaveHint
} from "./time-entry-draft";
import {
  clearTimeEntryDraftStorage,
  readTimeEntryDraftStorage,
  serializeTimeEntryDraft,
  timeEntryDraftStorageKey,
  writeTimeEntryDraftStorage
} from "./time-entry-draft-storage";
import { timeEntryOverlapNotice } from "./validate-time-entry-overlap";
import { JiraIssuePicker } from "@/components/jira-issue-picker";
import { api } from "@/lib/api";
import { filterLoggingProjects, filterLoggingTasks } from "@/lib/logging-catalog-filters";
import { formatProjectLabel } from "@/lib/project-labels";

export type { TimeEntryDraft } from "./time-entry-draft";
export {
  canSaveTaskDraft,
  draftFromLog,
  draftFromSlot,
  draftFromSlotRange,
  draftToIsoRange,
  suggestBillableFromTask,
  taskSaveHint
} from "./time-entry-draft";

const EMPTY_CATEGORIES: CategoryDto[] = [];

type TimeEntryDialogProps = {
  open: boolean;
  title: string;
  draft: TimeEntryDraft | null;
  projects: ProjectDto[];
  tasks: TaskDto[];
  categories?: CategoryDto[];
  taskLabel: (taskId: string) => string;
  workspaceNames?: Record<string, string>;
  editingLog?: TimeLogDto | null;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onDraftChange: (draft: TimeEntryDraft) => void;
  onSave: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
  workspaceId?: string;
  timezone?: string;
  jiraSuggestions?: JiraIssueDto[];
};

export function TimeEntryDialog({
  open,
  title,
  draft,
  projects,
  tasks,
  categories = EMPTY_CATEGORIES,
  workspaceNames,
  editingLog,
  saving,
  error,
  onClose,
  onDraftChange,
  onSave,
  onDelete,
  readOnly = false,
  workspaceId,
  timezone = "UTC",
  jiraSuggestions = []
}: TimeEntryDialogProps) {
  const userId = useSessionStore((s) => s.session?.user?.id);
  const sessionWorkspaceId = useSessionStore((s) => s.session?.workspaceId);
  const favoritesWorkspaceId = workspaceId ?? sessionWorkspaceId;
  const { favoriteProjectIds, favoriteTaskIds, toggleProject, toggleTask } = useEntryFavorites(
    userId,
    favoritesWorkspaceId
  );
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "history">("details");
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [durationText, setDurationText] = useState("0:00");
  const [durationError, setDurationError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [restoredBanner, setRestoredBanner] = useState(false);
  const durationFocusedRef = useRef(false);
  const openSessionRef = useRef(false);
  const baselineSerializedRef = useRef<string | null>(null);
  const { data: liveCategories = [] } = useCategoriesListQuery(
    workspaceId ?? "",
    open && Boolean(workspaceId)
  );
  const selectorCategories = liveCategories.length > 0 ? liveCategories : categories;
  const clearedInvalidSelectionRef = useRef<string | null>(null);

  const draftStorageKey = useMemo(() => {
    if (!workspaceId) return null;
    return timeEntryDraftStorageKey(workspaceId, editingLog?.id ?? null);
  }, [workspaceId, editingLog?.id]);

  const isDirty = Boolean(
    draft &&
    baselineSerializedRef.current != null &&
    serializeTimeEntryDraft(draft) !== baselineSerializedRef.current
  );

  useEffect(() => {
    if (!open) {
      openSessionRef.current = false;
      baselineSerializedRef.current = null;
      setDiscardOpen(false);
      setRestoredBanner(false);
      return;
    }
    if (!draft || !draftStorageKey || readOnly || openSessionRef.current) return;

    openSessionRef.current = true;
    baselineSerializedRef.current = serializeTimeEntryDraft(draft);
    const saved = readTimeEntryDraftStorage(draftStorageKey);
    if (saved && serializeTimeEntryDraft(saved) !== baselineSerializedRef.current) {
      onDraftChange(saved);
      setRestoredBanner(true);
    }
  }, [open, draft, draftStorageKey, readOnly, onDraftChange]);

  useEffect(() => {
    if (!open || !draft || !draftStorageKey || readOnly || !openSessionRef.current) return;
    if (baselineSerializedRef.current == null) return;
    if (serializeTimeEntryDraft(draft) === baselineSerializedRef.current) return;
    writeTimeEntryDraftStorage(draftStorageKey, draft);
  }, [open, draft, draftStorageKey, readOnly]);

  function requestClose() {
    if (readOnly || !isDirty) {
      onClose();
      return;
    }
    setDiscardOpen(true);
  }

  function confirmDiscard() {
    if (draftStorageKey) clearTimeEntryDraftStorage(draftStorageKey);
    setDiscardOpen(false);
    setRestoredBanner(false);
    onClose();
  }

  const fetchAuditEvents = useCallback(async () => {
    if (!editingLog || !workspaceId) return [];
    const res = await api<ListTimelogAuditEventsResponseDto>(
      ROUTES.TIMELOGS.AUDIT_EVENTS(editingLog.id),
      { workspaceId }
    );
    return res.items;
  }, [editingLog, workspaceId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setActiveTab("details");
    } else {
      setRepeatOpen(false);
      setMoreOptionsOpen(false);
      durationFocusedRef.current = false;
      setDurationError(null);
    }
  }, [open, editingLog]);

  useEffect(() => {
    if (!draft || durationFocusedRef.current) return;
    const sec = durationSecFromStartEnd(draft.startTime, draft.endTime);
    setDurationText(sec != null ? formatDurationInput(sec) : "0:00");
    setDurationError(null);
  }, [draft?.startTime, draft?.endTime, draft]);

  const selectableProjects = useMemo(() => filterLoggingProjects(projects), [projects]);
  const orderedProjects = useMemo(
    () => prioritizeByFavoriteIds(selectableProjects, favoriteProjectIds),
    [selectableProjects, favoriteProjectIds]
  );
  const selectableTasks = useMemo(
    () => filterLoggingTasks(tasks, projects, selectorCategories),
    [tasks, projects, selectorCategories]
  );

  useEffect(() => {
    if (!open || !draft || readOnly) {
      clearedInvalidSelectionRef.current = null;
      return;
    }
    if (draft.projectId && !selectableProjects.some((p) => p.id === draft.projectId)) {
      const key = `p:${draft.projectId}`;
      if (clearedInvalidSelectionRef.current !== key) {
        clearedInvalidSelectionRef.current = key;
        onDraftChange({ ...draft, projectId: "", taskSelection: "" });
      }
      return;
    }
    if (draft.taskSelection && !selectableTasks.some((t) => t.id === draft.taskSelection)) {
      const key = `t:${draft.taskSelection}`;
      if (clearedInvalidSelectionRef.current !== key) {
        clearedInvalidSelectionRef.current = key;
        onDraftChange({ ...draft, taskSelection: "" });
      }
      return;
    }
    clearedInvalidSelectionRef.current = null;
  }, [open, draft, readOnly, selectableProjects, selectableTasks, onDraftChange]);

  const projectTasks = useMemo(
    () => (draft ? selectableTasks.filter((t) => t.projectId === draft.projectId) : []),
    [selectableTasks, draft]
  );

  const projectTaskGroups = useMemo(
    () => buildTaskSelectGroups(projectTasks, favoriteTaskIds),
    [projectTasks, favoriteTaskIds]
  );

  const occupancyRange = useMemo(() => {
    if (!open || !draft || readOnly) return null;
    const { startTime, endTime } = draftToIsoRange(draft, timezone);
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (!(end > start)) return null;
    return { start, end, from: startTime, to: endTime };
  }, [open, draft, readOnly, timezone]);

  const { data: occupancyItems = [] } = useTimelogOccupancyQuery(
    workspaceId ?? "",
    occupancyRange?.from,
    occupancyRange?.to,
    Boolean(open && workspaceId && occupancyRange)
  );

  const overlapNotice =
    occupancyRange && !readOnly
      ? timeEntryOverlapNotice(
          occupancyItems,
          occupancyRange.start,
          occupancyRange.end,
          timezone,
          editingLog?.id
        )
      : null;

  if (!mounted) return null;

  const canDelete = Boolean(editingLog && onDelete && !readOnly);
  const canEdit = !readOnly;
  const canRepeat = canEdit && !editingLog;
  const showJiraMoreOptions = canEdit && jiraSuggestions.length > 0;
  const canSave = draft ? canSaveTaskDraft(draft) : false;
  const saveHint = draft ? taskSaveHint(draft) : null;
  const recurrenceActive = draft ? (draft.recurrence ?? "none") !== "none" : false;
  const showRepeatAffordance = canRepeat && !repeatOpen && !recurrenceActive;

  const parsedValidation = error
    ? extractFieldErrorsFromMessage<"project" | "task" | "start" | "end" | "description">(error, {
        project: "Project",
        task: "Task",
        start: "Start",
        end: "End",
        description: "Description"
      })
    : { fieldErrors: {}, formError: "" };

  function patch(partial: Partial<TimeEntryDraft>) {
    if (draft) onDraftChange({ ...draft, ...partial });
  }

  function handleDateChange(dateKey: string) {
    const partial: Partial<TimeEntryDraft> = { date: dateKey };
    if (
      (draft?.recurrence ?? "none") !== "none" &&
      draft?.repeatUntil &&
      draft.repeatUntil < dateKey
    ) {
      partial.repeatUntil = dateKey;
    }
    patch(partial);
  }

  function handleStartChange(startTime: string) {
    if (!draft) return;
    const currentSec = durationSecFromStartEnd(draft.startTime, draft.endTime);
    if (currentSec != null && currentSec > 0) {
      patch({
        startTime,
        endTime: addDurationToStartTime(startTime, currentSec)
      });
      return;
    }
    patch({ startTime });
  }

  function handleEndChange(endTime: string) {
    patch({ endTime });
  }

  function handleDurationChange(value: string) {
    setDurationText(value);
    const sec = parseDurationInput(value);
    if (sec != null && sec > 0 && draft) {
      setDurationError(null);
      patch(applyDurationToDraft(draft, sec));
    }
  }

  function handleDurationBlur() {
    durationFocusedRef.current = false;
    const sec = parseDurationInput(durationText);
    if (sec != null && sec > 0 && draft) {
      patch(applyDurationToDraft(draft, sec));
      setDurationText(formatDurationInput(sec));
      setDurationError(null);
      return;
    }
    const current = draft ? durationSecFromStartEnd(draft.startTime, draft.endTime) : null;
    setDurationText(current != null ? formatDurationInput(current) : "0:00");
    setDurationError(durationText.trim() && sec === null ? "Use 2.5 or 2:30" : null);
  }

  function openRepeatPanel() {
    setRepeatOpen(true);
    if ((draft?.recurrence ?? "none") === "none") {
      patch({
        recurrence: "weekdays",
        repeatUntil: draft?.repeatUntil ?? draft?.date
      });
    }
  }

  const description =
    editingLog?.source === "timer" ? (
      <span className="block text-xs">Started with the stopwatch</span>
    ) : undefined;

  const footer =
    activeTab === "details" ? (
      <div className="flex w-full flex-wrap items-center gap-2">
        {canEdit && (
          <Button
            type="submit"
            form="time-entry-form"
            disabled={saving || !canSave || Boolean(overlapNotice)}
            title={overlapNotice ?? saveHint ?? undefined}
          >
            {saving ? "Saving…" : editingLog ? "Save changes" : "Log time"}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={requestClose}>
          {readOnly ? "Close" : "Cancel"}
        </Button>
        {canDelete && (
          <Button
            type="button"
            variant="destructive"
            className="sm:ml-auto"
            disabled={saving}
            onClick={() => {
              if (onDelete) onDelete();
            }}
          >
            Delete entry
          </Button>
        )}
      </div>
    ) : (
      <Button type="button" variant="outline" onClick={requestClose}>
        Close
      </Button>
    );

  return (
    <>
      <AppModal
        open={open && draft !== null}
        onOpenChange={(next) => {
          if (!next) requestClose();
        }}
        onInteractOutside={(event) => {
          if (readOnly || saving) return;
          if (isDirty) {
            event.preventDefault();
            setDiscardOpen(true);
          }
        }}
        title={title}
        description={description}
        icon={<Clock className="size-5" />}
        size="md"
        bodyClassName="space-y-4"
        footer={footer}
      >
        {restoredBanner ? (
          <div
            className="flex items-start justify-between gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
            role="status"
          >
            <span>Restored your unsaved draft from before you left.</span>
            <button
              type="button"
              className="shrink-0 font-medium text-foreground underline-offset-2 hover:underline"
              onClick={() => setRestoredBanner(false)}
            >
              Dismiss
            </button>
          </div>
        ) : null}
        {draft && editingLog && workspaceId ? (
          <div className="flex rounded-lg border border-border bg-muted/40 p-1">
            <button
              type="button"
              className={cn(
                "flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition-all duration-200 cursor-pointer",
                activeTab === "details"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("details")}
            >
              Details
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition-all duration-200 cursor-pointer",
                activeTab === "history"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("history")}
            >
              Change History
            </button>
          </div>
        ) : null}

        {draft && activeTab === "details" ? (
          <form
            id="time-entry-form"
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              onSave();
            }}
          >
            <div className="space-y-2">
              <Label>Project</Label>
              <SearchableSelect
                value={draft.projectId}
                onValueChange={(projectId) =>
                  patch({
                    projectId,
                    taskSelection: "",
                    isBillable: true
                  })
                }
                options={orderedProjects.map((p) => ({
                  value: p.id,
                  label: formatProjectLabel(p, workspaceNames)
                }))}
                placeholder="Select project"
                searchPlaceholder="Search projects…"
                disabled={!canEdit}
                contentClassName="z-[100]"
                favoritedValues={favoriteProjectIds}
                onToggleFavorite={canEdit ? toggleProject : undefined}
                renderOption={(option) => (
                  <span className="flex items-center gap-2">
                    <ProjectColorDot
                      color={
                        selectableProjects.find((p) => p.id === option.value)?.color ?? "#236bfe"
                      }
                    />
                    {option.label}
                  </span>
                )}
                renderValue={(option) =>
                  option ? (
                    <span className="flex items-center gap-2">
                      <ProjectColorDot
                        color={
                          selectableProjects.find((p) => p.id === option.value)?.color ?? "#236bfe"
                        }
                      />
                      {option.label}
                    </span>
                  ) : (
                    "Select project"
                  )
                }
                aria-label="Project"
                triggerClassName={
                  parsedValidation.fieldErrors.project ? "border-destructive" : undefined
                }
              />
              {parsedValidation.fieldErrors.project ? (
                <p className="text-xs text-destructive">{parsedValidation.fieldErrors.project}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Task</Label>
              <SearchableSelect
                key={draft.projectId}
                value={draft.taskSelection || ""}
                onValueChange={(taskSelection) =>
                  patch({
                    taskSelection,
                    isBillable: suggestBillableFromTask(selectableTasks, taskSelection)
                  })
                }
                groups={projectTaskGroups}
                favoritedValues={favoriteTaskIds}
                onToggleFavorite={
                  canEdit
                    ? (taskId) => {
                        const task = projectTasks.find((t) => t.id === taskId);
                        const project = selectableProjects.find((p) => p.id === draft.projectId);
                        if (!task || !project) return;
                        toggleTask({
                          projectId: project.id,
                          taskId: task.id,
                          projectName: project.name,
                          taskName: task.taskName,
                          projectColor: project.color
                        });
                      }
                    : undefined
                }
                placeholder={
                  !draft.projectId
                    ? "Select a project first"
                    : projectTasks.length === 0
                      ? "No tasks for this project"
                      : "Select a task"
                }
                searchPlaceholder="Search tasks…"
                disabled={!canEdit || !draft.projectId || projectTasks.length === 0}
                contentClassName="z-[100]"
                triggerClassName={
                  parsedValidation.fieldErrors.task || (draft.projectId && !draft.taskSelection)
                    ? "border-destructive"
                    : undefined
                }
                aria-label="Task"
              />
              {parsedValidation.fieldErrors.task ? (
                <p className="text-xs text-destructive">{parsedValidation.fieldErrors.task}</p>
              ) : null}
              {draft.projectId && projectTasks.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No tasks yet on this project. Ask your admin to add tasks before logging time.
                </p>
              )}
              {saveHint && (
                <p className="text-xs text-amber-600 dark:text-amber-500" role="status">
                  {saveHint}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>When</Label>
              <DatePicker
                value={draft.date}
                onChange={handleDateChange}
                placeholder="Select date"
                ariaLabel="Entry date"
                disabled={!canEdit}
                className="h-10 w-full justify-start bg-background"
                popoverAlign="start"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="entry-duration" className="text-xs text-muted-foreground">
                    Duration
                  </Label>
                  <Input
                    id="entry-duration"
                    type="text"
                    inputMode="decimal"
                    placeholder="0:00"
                    value={durationText}
                    disabled={!canEdit}
                    className="font-mono tabular-nums"
                    onFocus={() => {
                      durationFocusedRef.current = true;
                    }}
                    onChange={(e) => handleDurationChange(e.target.value)}
                    onBlur={handleDurationBlur}
                    aria-label="Duration"
                    aria-invalid={Boolean(durationError)}
                    aria-describedby={durationError ? "entry-duration-error" : undefined}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="entry-start" className="text-xs text-muted-foreground">
                    Start
                  </Label>
                  <Input
                    id="entry-start"
                    type="time"
                    value={draft.startTime}
                    disabled={!canEdit}
                    onChange={(e) => handleStartChange(e.target.value)}
                    required
                    aria-label="Start time"
                    aria-invalid={Boolean(parsedValidation.fieldErrors.start || overlapNotice)}
                    className={overlapNotice ? "border-destructive" : undefined}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="entry-end" className="text-xs text-muted-foreground">
                    End
                  </Label>
                  <Input
                    id="entry-end"
                    type="time"
                    value={draft.endTime}
                    disabled={!canEdit}
                    onChange={(e) => handleEndChange(e.target.value)}
                    required
                    aria-label="End time"
                    aria-invalid={Boolean(parsedValidation.fieldErrors.end || overlapNotice)}
                    className={overlapNotice ? "border-destructive" : undefined}
                  />
                </div>
              </div>
              {durationError ? (
                <p id="entry-duration-error" className="text-xs text-destructive">
                  {durationError}
                </p>
              ) : null}
              {parsedValidation.fieldErrors.start ? (
                <p className="text-xs text-destructive">{parsedValidation.fieldErrors.start}</p>
              ) : null}
              {parsedValidation.fieldErrors.end ? (
                <p className="text-xs text-destructive">{parsedValidation.fieldErrors.end}</p>
              ) : null}
              {overlapNotice ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-status-danger-border bg-status-danger-bg px-3 py-2 text-sm text-status-danger-fg"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <p>{overlapNotice}</p>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="entry-description">Description</Label>
                {showRepeatAffordance ? (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={openRepeatPanel}
                  >
                    + Repeat on more days
                  </button>
                ) : null}
              </div>
              <Input
                id="entry-description"
                value={draft.description}
                disabled={!canEdit}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="What did you work on?"
                aria-invalid={Boolean(parsedValidation.fieldErrors.description)}
              />
              {parsedValidation.fieldErrors.description ? (
                <p className="text-xs text-destructive">
                  {parsedValidation.fieldErrors.description}
                </p>
              ) : null}
            </div>

            {canRepeat ? (
              <RepeatEntryPanel
                open={repeatOpen}
                draft={draft}
                disabled={!canEdit}
                onPatch={patch}
                onOpenChange={setRepeatOpen}
              />
            ) : null}

            {showJiraMoreOptions ? (
              <div className="space-y-2">
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  aria-expanded={moreOptionsOpen}
                  onClick={() => setMoreOptionsOpen((prev) => !prev)}
                >
                  More options
                  <ChevronDown
                    className={cn("size-3.5 transition-transform", moreOptionsOpen && "rotate-180")}
                    aria-hidden
                  />
                </button>
                {moreOptionsOpen ? (
                  <JiraIssuePicker
                    issues={jiraSuggestions}
                    onSelect={(value) => patch({ description: value })}
                  />
                ) : null}
              </div>
            ) : null}

            {readOnly && editingLog ? (
              <p className="text-sm text-amber-600 dark:text-amber-500" role="status">
                This timesheet period is locked (submitted or approved). Entries cannot be edited or
                deleted.
              </p>
            ) : null}
            {!overlapNotice && parsedValidation.formError ? (
              <p className="text-sm text-destructive">{parsedValidation.formError}</p>
            ) : !overlapNotice &&
              error &&
              Object.keys(parsedValidation.fieldErrors).length === 0 ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
          </form>
        ) : draft && activeTab === "history" ? (
          <div className="max-h-72 overflow-y-auto pr-1">
            <TimeEntryAuditTrail fetchEvents={fetchAuditEvents} tasks={tasks} projects={projects} />
          </div>
        ) : null}
      </AppModal>
      <ConfirmDialog
        open={discardOpen}
        title="Discard unsaved changes?"
        description="Your edits will be lost. This cannot be undone."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={confirmDiscard}
        onCancel={() => setDiscardOpen(false)}
      />
    </>
  );
}
