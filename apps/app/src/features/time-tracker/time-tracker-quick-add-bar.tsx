"use client";

import type { CategoryDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import { Button, DatePicker, Input, ProjectColorDot, SearchableSelect, cn } from "@kloqra/ui";
import {
  buildTaskSelectGroups,
  prioritizeByFavoriteIds,
  useEntryFavorites,
  useSessionStore
} from "@kloqra/web-shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { todayInZone, toTimeValueInZone } from "@/features/timesheet/calendar-utils";
import {
  addDurationToStartTime,
  applyDurationToDraft,
  durationSecFromStartEnd,
  formatDurationInput,
  parseDurationInput
} from "@/features/timesheet/parse-duration-input";
import {
  canSaveTaskDraft,
  draftFromSlot,
  suggestBillableFromTask,
  type TimeEntryDraft
} from "@/features/timesheet/time-entry-draft";
import { filterLoggingProjects, filterLoggingTasks } from "@/lib/logging-catalog-filters";
import { formatProjectLabel } from "@/lib/project-labels";

type TimeTrackerQuickAddBarProps = {
  projects: ProjectDto[];
  tasks: TaskDto[];
  categories: CategoryDto[];
  timezone: string;
  /** Bump after a successful create to clear the bar back to defaults. */
  resetKey?: number;
  saving?: boolean;
  error?: string | null;
  disabled?: boolean;
  onSubmit: (draft: TimeEntryDraft) => void | Promise<void>;
  onClearError?: () => void;
};

function defaultDraft(timezone: string): TimeEntryDraft {
  const day = todayInZone(timezone);
  const [zonedHour = "09", zonedMinute = "00"] = toTimeValueInZone(new Date(), timezone).split(":");
  const startHour = Number(zonedHour);
  const startMinute = startHour === 23 ? 0 : Number(zonedMinute) < 30 ? 0 : 30;
  return draftFromSlot(day, startHour, startMinute, timezone);
}

export function TimeTrackerQuickAddBar({
  projects,
  tasks,
  categories,
  timezone,
  resetKey = 0,
  saving = false,
  error = null,
  disabled = false,
  onSubmit,
  onClearError
}: TimeTrackerQuickAddBarProps) {
  const userId = useSessionStore((s) => s.session?.user?.id);
  const workspaceId = useSessionStore((s) => s.session?.workspaceId);
  const { favoriteProjectIds, favoriteTaskIds, toggleProject, toggleTask } = useEntryFavorites(
    userId,
    workspaceId
  );
  const [draft, setDraft] = useState<TimeEntryDraft>(() => defaultDraft(timezone));
  const [durationText, setDurationText] = useState("0:30");
  const [durationError, setDurationError] = useState<string | null>(null);
  const durationFocusedRef = useRef(false);

  const selectableProjects = useMemo(() => filterLoggingProjects(projects), [projects]);
  const orderedProjects = useMemo(
    () => prioritizeByFavoriteIds(selectableProjects, favoriteProjectIds),
    [selectableProjects, favoriteProjectIds]
  );
  const selectableTasks = useMemo(
    () => filterLoggingTasks(tasks, projects, categories),
    [tasks, projects, categories]
  );
  const projectTasks = useMemo(
    () => selectableTasks.filter((task) => task.projectId === draft.projectId),
    [selectableTasks, draft.projectId]
  );
  const projectTaskGroups = useMemo(
    () => buildTaskSelectGroups(projectTasks, favoriteTaskIds),
    [projectTasks, favoriteTaskIds]
  );

  useEffect(() => {
    const next = defaultDraft(timezone);
    setDraft(next);
    const sec = durationSecFromStartEnd(next.startTime, next.endTime);
    setDurationText(sec != null ? formatDurationInput(sec) : "0:30");
    setDurationError(null);
  }, [resetKey, timezone]);

  useEffect(() => {
    if (durationFocusedRef.current) return;
    const sec = durationSecFromStartEnd(draft.startTime, draft.endTime);
    setDurationText(sec != null ? formatDurationInput(sec) : "0:00");
  }, [draft.startTime, draft.endTime]);

  function patch(partial: Partial<TimeEntryDraft>) {
    onClearError?.();
    setDraft((current) => ({ ...current, ...partial }));
  }

  function handleStartChange(startTime: string) {
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
    if (sec == null) return;
    setDurationError(null);
    patch(applyDurationToDraft(draft, sec));
  }

  function handleDurationBlur() {
    durationFocusedRef.current = false;
    const sec = parseDurationInput(durationText);
    if (sec != null) {
      setDurationError(null);
      setDurationText(formatDurationInput(sec));
      patch(applyDurationToDraft(draft, sec));
      return;
    }
    const current = durationSecFromStartEnd(draft.startTime, draft.endTime);
    setDurationText(current != null ? formatDurationInput(current) : "0:00");
    setDurationError(durationText.trim() ? "Use 2.5 or 2:30" : null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (disabled || saving || !canSaveTaskDraft(draft)) return;
    await onSubmit(draft);
  }

  const canAdd = canSaveTaskDraft(draft) && !saving && !disabled;
  const busy = disabled || saving;
  const controlClass = "h-9 shrink-0";

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className={cn(
        "rounded-xl border border-border/70 bg-background shadow-sm",
        "flex flex-wrap items-center gap-2 p-2 sm:flex-nowrap sm:gap-1.5 sm:overflow-x-auto sm:p-2"
      )}
      aria-label="Quick add time entry"
    >
      <Input
        value={draft.description}
        onChange={(event) => patch({ description: event.target.value })}
        placeholder="What have you worked on?"
        aria-label="Description"
        disabled={busy}
        className="h-9 min-w-[10rem] flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 sm:min-w-[12rem]"
      />
      <SearchableSelect
        value={draft.projectId}
        onValueChange={(projectId) =>
          patch({
            projectId,
            taskSelection: "",
            isBillable: true
          })
        }
        options={orderedProjects.map((project) => ({
          value: project.id,
          label: formatProjectLabel(project)
        }))}
        placeholder="Project"
        searchPlaceholder="Search projects…"
        disabled={busy}
        aria-label="Project"
        triggerClassName={cn(controlClass, "w-[8.5rem]")}
        contentClassName="z-[100]"
        favoritedValues={favoriteProjectIds}
        onToggleFavorite={busy ? undefined : toggleProject}
        renderOption={(option) => (
          <span className="flex items-center gap-2">
            <ProjectColorDot
              color={
                selectableProjects.find((project) => project.id === option.value)?.color ??
                "#236bfe"
              }
            />
            {option.label}
          </span>
        )}
        renderValue={(option) =>
          option ? (
            <span className="flex items-center gap-2 truncate">
              <ProjectColorDot
                color={
                  selectableProjects.find((project) => project.id === option.value)?.color ??
                  "#236bfe"
                }
              />
              <span className="truncate">{option.label}</span>
            </span>
          ) : (
            "Project"
          )
        }
      />
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
          busy
            ? undefined
            : (taskId) => {
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
        }
        placeholder={!draft.projectId ? "Task" : projectTasks.length === 0 ? "No tasks" : "Task"}
        searchPlaceholder="Search tasks…"
        disabled={busy || !draft.projectId || projectTasks.length === 0}
        aria-label="Task"
        triggerClassName={cn(controlClass, "w-[8.5rem]")}
        contentClassName="z-[100]"
      />
      <DatePicker
        value={draft.date}
        onChange={(date) => patch({ date })}
        disabled={busy}
        ariaLabel="Date"
        className={cn(controlClass, "w-[8.75rem]")}
      />
      <Input
        type="time"
        value={draft.startTime}
        onChange={(event) => handleStartChange(event.target.value)}
        disabled={busy}
        required
        aria-label="Start time"
        className={cn(controlClass, "min-w-[9.5rem] w-[9.5rem] tabular-nums")}
      />
      <span className="hidden text-muted-foreground sm:inline" aria-hidden>
        –
      </span>
      <Input
        type="time"
        value={draft.endTime}
        onChange={(event) => handleEndChange(event.target.value)}
        disabled={busy}
        required
        aria-label="End time"
        className={cn(controlClass, "min-w-[9.5rem] w-[9.5rem] tabular-nums")}
      />
      <Input
        value={durationText}
        onChange={(event) => handleDurationChange(event.target.value)}
        onFocus={() => {
          durationFocusedRef.current = true;
        }}
        onBlur={handleDurationBlur}
        placeholder="0:30"
        aria-label="Duration"
        disabled={busy}
        className={cn(controlClass, "w-[4.25rem] tabular-nums")}
        aria-invalid={Boolean(durationError)}
      />
      <Button
        type="submit"
        variant="outline"
        disabled={!canAdd}
        className={cn(controlClass, "ml-auto shrink-0 px-3")}
      >
        {saving ? "Adding…" : "Add entry"}
      </Button>
      {(error || durationError) && (
        <p className="basis-full text-xs text-destructive" role="alert">
          {error ?? durationError}
        </p>
      )}
    </form>
  );
}
