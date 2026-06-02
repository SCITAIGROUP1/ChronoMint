"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
  Label,
  ProjectColorDot,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@chronomint/ui";
import type { TimeLogDto, TaskDto, ProjectDto } from "@chronomint/contracts";
import { formatProjectLabel } from "@/lib/project-labels";
import {
  combineDayAndTime,
  formatDuration,
  formatDraftDateLabel,
  timeFromSlotIndex,
  toDateKey,
  toTimeValue
} from "./calendar-utils";

export const NEW_TASK = "__new__";

export type TimeEntryDraft = {
  projectId: string;
  taskSelection: string;
  newTaskName: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  isBillable: boolean;
};

export function suggestBillableFromTask(tasks: TaskDto[], taskSelection: string): boolean {
  if (!taskSelection || taskSelection === NEW_TASK) return true;
  return tasks.find((t) => t.id === taskSelection)?.billableDefault ?? true;
}

export function canSaveTaskDraft(draft: TimeEntryDraft): boolean {
  if (!draft.projectId) return false;
  if (draft.taskSelection === NEW_TASK) return draft.newTaskName.trim().length > 0;
  return Boolean(draft.taskSelection);
}

export function draftToIsoRange(draft: TimeEntryDraft): { startTime: string; endTime: string } {
  const start = combineDayAndTime(draft.date, draft.startTime);
  const end = combineDayAndTime(draft.date, draft.endTime);
  return { startTime: start.toISOString(), endTime: end.toISOString() };
}

type TimeEntryDialogProps = {
  open: boolean;
  title: string;
  draft: TimeEntryDraft | null;
  projects: ProjectDto[];
  tasks: TaskDto[];
  taskLabel: (taskId: string) => string;
  workspaceNames?: Record<string, string>;
  editingLog?: TimeLogDto | null;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onDraftChange: (draft: TimeEntryDraft) => void;
  onSave: () => void;
  onDelete?: () => void;
};

export function TimeEntryDialog({
  open,
  title,
  draft,
  projects,
  tasks,
  taskLabel,
  workspaceNames,
  editingLog,
  saving,
  error,
  onClose,
  onDraftChange,
  onSave,
  onDelete
}: TimeEntryDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const projectTasks = useMemo(
    () => (draft ? tasks.filter((t) => t.projectId === draft.projectId) : []),
    [tasks, draft]
  );

  if (!open || !draft || !mounted) return null;

  const canDelete = Boolean(editingLog && onDelete);
  const dateLabel = formatDraftDateLabel(draft, editingLog);
  const canSave = canSaveTaskDraft(draft);

  let durationHint = "";
  try {
    const { startTime, endTime } = draftToIsoRange(draft);
    const sec = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000;
    if (sec > 0) durationHint = formatDuration(sec);
  } catch {
    /* ignore */
  }

  function patch(partial: Partial<TimeEntryDraft>) {
    onDraftChange({ ...draft!, ...partial });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="time-entry-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="time-entry-title" className="text-lg font-semibold">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{dateLabel}</p>
        {editingLog?.source === "timer" && (
          <p className="mt-1 text-xs text-muted-foreground">Started with the stopwatch</p>
        )}
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <div className="space-y-2">
            <Label>Project</Label>
            <Select
              value={draft.projectId}
              onValueChange={(projectId) =>
                patch({
                  projectId,
                  taskSelection: "",
                  newTaskName: "",
                  isBillable: true
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <ProjectColorDot color={p.color} />
                      {formatProjectLabel(p, workspaceNames)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Task</Label>
            <Select
              value={draft.taskSelection}
              onValueChange={(taskSelection) =>
                patch({
                  taskSelection,
                  newTaskName: taskSelection === NEW_TASK ? draft.newTaskName : "",
                  isBillable: suggestBillableFromTask(tasks, taskSelection)
                })
              }
              disabled={!draft.projectId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={draft.projectId ? "Select or create a task" : "Select a project first"}
                />
              </SelectTrigger>
              <SelectContent>
                {projectTasks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.taskName}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_TASK}>+ Create new task…</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {draft.taskSelection === NEW_TASK && (
            <div className="space-y-2">
              <Label htmlFor="entry-new-task">New task name</Label>
              <Input
                id="entry-new-task"
                value={draft.newTaskName}
                onChange={(e) => patch({ newTaskName: e.target.value })}
                placeholder="e.g. Frontend development"
                required
              />
            </div>
          )}

          {draft.taskSelection && draft.taskSelection !== NEW_TASK && (
            <p className="text-xs text-muted-foreground">{taskLabel(draft.taskSelection)}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry-start">Start</Label>
              <Input
                id="entry-start"
                type="time"
                value={draft.startTime}
                onChange={(e) => patch({ startTime: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry-end">End</Label>
              <Input
                id="entry-end"
                type="time"
                value={draft.endTime}
                onChange={(e) => patch({ endTime: e.target.value })}
                required
              />
            </div>
          </div>
          {durationHint && (
            <p className="text-xs text-muted-foreground">Duration: {durationHint}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="entry-description">Description</Label>
            <Input
              id="entry-description"
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="What did you work on?"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border border-input accent-primary"
              checked={draft.isBillable}
              onChange={(e) => patch({ isBillable: e.target.checked })}
            />
            <span>Billable time</span>
          </label>
          <p className="text-xs text-muted-foreground">
            Billable is set per entry — the same task can include both billable and non-billable
            work.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button type="submit" disabled={saving || !canSave}>
              {saving ? "Saving…" : editingLog ? "Save changes" : "Log time"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {canDelete && (
              <Button
                type="button"
                variant="destructive"
                className="ml-auto"
                disabled={saving}
                onClick={() => {
                  if (onDelete) onDelete();
                }}
              >
                Delete entry
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function emptyTaskFields(): Pick<TimeEntryDraft, "projectId" | "taskSelection" | "newTaskName"> {
  return { projectId: "", taskSelection: "", newTaskName: "" };
}

export function draftFromSlot(
  day: Date,
  hour: number,
  minute: number,
  endHour?: number,
  endMinute?: number
): TimeEntryDraft {
  const start = new Date(day);
  start.setHours(hour, minute, 0, 0);
  const end = new Date(day);
  if (endHour !== undefined && endMinute !== undefined) {
    end.setHours(endHour, endMinute, 0, 0);
    const endIdx = endHour * 60 + endMinute;
    const startIdx = hour * 60 + minute;
    if (endIdx <= startIdx) {
      end.setMinutes(end.getMinutes() + 30);
    }
  } else {
    end.setTime(start.getTime());
    end.setMinutes(end.getMinutes() + 30);
  }
  return {
    ...emptyTaskFields(),
    date: toDateKey(day),
    startTime: toTimeValue(start),
    endTime: toTimeValue(end),
    description: "",
    isBillable: true
  };
}

export function draftFromSlotRange(
  day: Date,
  startIndex: number,
  endIndex: number
): TimeEntryDraft {
  const startSlot = timeFromSlotIndex(Math.min(startIndex, endIndex));
  const endSlot = timeFromSlotIndex(Math.max(startIndex, endIndex));
  const endMinute = endSlot.minute + 30;
  const endHour = endMinute >= 60 ? endSlot.hour + 1 : endSlot.hour;
  const normalizedEndMinute = endMinute >= 60 ? 0 : endMinute;
  return draftFromSlot(day, startSlot.hour, startSlot.minute, endHour, normalizedEndMinute);
}

export function draftFromLog(log: TimeLogDto, tasks: TaskDto[]): TimeEntryDraft {
  const start = new Date(log.startTime);
  const end = new Date(log.endTime);
  const task = tasks.find((t) => t.id === log.taskId);
  return {
    projectId: task?.projectId ?? "",
    taskSelection: log.taskId,
    newTaskName: "",
    date: toDateKey(start),
    startTime: toTimeValue(start),
    endTime: toTimeValue(end),
    description: log.description ?? "",
    isBillable: log.isBillable
  };
}
