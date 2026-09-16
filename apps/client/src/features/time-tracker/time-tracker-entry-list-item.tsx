"use client";

import type { ProjectDto, TaskDto, TimeLogDto, TimesheetPeriodDto } from "@kloqra/contracts";
import { ProjectColorDot, cn } from "@kloqra/ui";
import { Lock } from "lucide-react";
import { formatEntryTimeRange } from "./display-format";
import { resolveEntryApprovalStatus } from "./entry-approval-status";
import { formatHoursDecimal } from "./group-logs-by-week";
import { TimeTrackerEntryActions } from "./time-tracker-entry-actions";
import { TimeTrackerEntryStatus } from "./time-tracker-entry-status";

type AdminTimeTrackerEntryListItemProps = {
  log: TimeLogDto;
  task?: TaskDto;
  project?: ProjectDto;
  projectName: string;
  entryColor: string;
  memberName: string;
  timezone: string;
};

type TimeTrackerEntryListItemProps = {
  log: TimeLogDto;
  task?: TaskDto;
  project?: ProjectDto;
  projectName: string;
  entryColor: string;
  submissionByKey: Map<string, TimesheetPeriodDto>;
  locked: boolean;
  inactive?: boolean;
  onEdit: (log: TimeLogDto) => void;
  onDelete: (log: TimeLogDto) => void;
  onDuplicate?: (log: TimeLogDto) => void;
  readOnly?: boolean;
  timezone: string;
};

function adminDetailLine(
  memberName: string,
  taskName: string | undefined,
  description: string | null
): string {
  return [memberName, taskName, description?.trim() || null].filter(Boolean).join(" · ");
}

function personalDetailLine(
  taskName: string | undefined,
  description: string | null
): string | null {
  const parts = [taskName, description?.trim() || null].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function EntryTimeMeta({
  log,
  timezone,
  inactive = false
}: {
  log: TimeLogDto;
  timezone: string;
  inactive?: boolean;
}) {
  const range = formatEntryTimeRange(log.startTime, log.endTime, timezone);
  return (
    <div className="flex shrink-0 items-center gap-2 tabular-nums">
      <span className="text-xs text-muted-foreground" aria-label={`Time range ${range}`}>
        {range}
      </span>
      <span
        className={cn(
          "min-w-[2.75rem] text-right text-sm font-semibold",
          inactive ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {formatHoursDecimal(log.durationSec)}
      </span>
    </div>
  );
}

export function AdminTimeTrackerEntryListItem({
  log,
  task,
  project,
  projectName,
  entryColor,
  memberName,
  timezone
}: AdminTimeTrackerEntryListItemProps) {
  const approval = resolveEntryApprovalStatus(log, project, new Map());
  const detailLine = adminDetailLine(memberName, task?.taskName, log.description);

  return (
    <div className="group flex items-center gap-2.5 border-b border-border/50 px-3 py-2 transition-colors last:border-0 hover:bg-muted/20 sm:gap-3 sm:px-5">
      <ProjectColorDot color={entryColor} className="shrink-0" />
      <div className="flex min-w-0 flex-1 items-baseline gap-1.5 overflow-hidden">
        <p className="shrink-0 truncate text-sm font-semibold text-foreground">{projectName}</p>
        {detailLine ? (
          <p className="min-w-0 truncate text-sm text-muted-foreground">{detailLine}</p>
        ) : null}
      </div>
      <TimeTrackerEntryStatus approval={approval} isBillable={log.isBillable} />
      <EntryTimeMeta log={log} timezone={timezone} />
    </div>
  );
}

/** Personal / My time entry row with edit/delete actions. */
export function TimeTrackerEntryListItem({
  log,
  task,
  project,
  projectName,
  entryColor,
  submissionByKey,
  locked,
  inactive = false,
  onEdit,
  onDelete,
  onDuplicate,
  readOnly = false,
  timezone
}: TimeTrackerEntryListItemProps) {
  const approval = resolveEntryApprovalStatus(log, project, submissionByKey);
  const detailLine = personalDetailLine(task?.taskName, log.description);

  return (
    <div
      className={cn(
        "group flex items-center gap-2.5 border-b border-border/50 px-3 py-2 transition-colors last:border-0 sm:gap-3 sm:px-5",
        inactive ? "bg-muted/50 hover:bg-muted/50" : "hover:bg-muted/20"
      )}
    >
      <ProjectColorDot color={entryColor} className={cn("shrink-0", inactive && "opacity-60")} />
      <div className="flex min-w-0 flex-1 items-baseline gap-1.5 overflow-hidden">
        <p
          className={cn(
            "shrink-0 truncate text-sm font-semibold",
            inactive ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {projectName}
        </p>
        {detailLine ? (
          <p
            className={cn(
              "min-w-0 truncate text-sm",
              inactive ? "text-muted-foreground/90" : "text-muted-foreground"
            )}
          >
            {detailLine}
          </p>
        ) : null}
      </div>
      {inactive ? (
        <span title="Read-only — project, category, or task is inactive">
          <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-label="Inactive" />
        </span>
      ) : null}
      <TimeTrackerEntryStatus approval={approval} isBillable={log.isBillable} />
      <EntryTimeMeta log={log} timezone={timezone} inactive={inactive} />
      {!readOnly && !inactive ? (
        <TimeTrackerEntryActions
          log={log}
          locked={locked}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
        />
      ) : null}
    </div>
  );
}
