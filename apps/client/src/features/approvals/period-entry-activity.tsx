"use client";

import { ROUTES } from "@kloqra/contracts";
import type {
  ListTimeLogsResponseDto,
  ListTimelogAuditEventsResponseDto,
  PendingTimesheetDto,
  TaskDto,
  TimeLogDto
} from "@kloqra/contracts";
import { Button, TimeEntryAuditEventList, type TimeEntryAuditEvent, cn } from "@kloqra/ui";
import { useTasksListQuery } from "@kloqra/web-shared";
import { useEffect, useState } from "react";
import {
  formatEntryDuration,
  formatEntryTimeRange,
  mergeAuditEvents,
  sortLogsByStartDesc
} from "./period-entry-activity.utils";
import { api } from "@/lib/api";

export const APPROVALS_EXPANDED_CELL_CLASS =
  "p-0 whitespace-normal first:pl-0 last:pr-0 align-top border-t border-b border-border/40";

type ActivityItem = Pick<
  PendingTimesheetDto,
  "id" | "userId" | "projectId" | "projectName" | "periodStart" | "periodEnd"
>;

function PeriodEntryList({
  logs,
  tasks,
  timezone,
  hiddenLogCount
}: {
  logs: TimeLogDto[];
  tasks: Pick<TaskDto, "id" | "taskName">[];
  timezone?: string;
  hiddenLogCount: number;
}) {
  return (
    <>
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Logged entries in this submission
      </h4>
      <ul className="space-y-2">
        {logs.map((log) => {
          const task = tasks.find((entry) => entry.id === log.taskId);
          return (
            <li
              key={log.id}
              className="space-y-1 rounded-lg border border-border/50 bg-background/50 px-3 py-2.5 text-xs leading-relaxed"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="font-semibold text-foreground">{task?.taskName ?? "Task"}</p>
                {log.isBillable ? (
                  <span className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-1.5 py-0 text-[9px] font-medium uppercase tracking-wide text-primary">
                    Billable
                  </span>
                ) : (
                  <span className="inline-flex rounded-full border border-border/70 bg-muted/50 px-1.5 py-0 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                    Non-billable
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">
                {formatEntryTimeRange(log.startTime, log.endTime, timezone)} ·{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {formatEntryDuration(log.durationSec)}
                </span>
              </p>
              {log.description ? (
                <p className="line-clamp-2 text-muted-foreground italic">
                  &quot;{log.description}&quot;
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      {hiddenLogCount > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          +{hiddenLogCount} more {hiddenLogCount === 1 ? "entry" : "entries"}
        </p>
      ) : null}
    </>
  );
}

function PeriodEntryActivityBody({
  loading,
  logs,
  auditEvents,
  tasks,
  item,
  timezone
}: {
  loading: boolean;
  logs: TimeLogDto[];
  auditEvents: TimeEntryAuditEvent[];
  tasks: Pick<TaskDto, "id" | "taskName" | "projectId">[];
  item: ActivityItem;
  timezone?: string;
}) {
  const visibleLogs = logs.slice(0, 8);
  const hiddenLogCount = Math.max(0, logs.length - visibleLogs.length);

  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading entry activity…</p>;
  }
  if (logs.length === 0) {
    return <p className="text-xs text-muted-foreground">No entries in this period.</p>;
  }
  if (auditEvents.length > 0) {
    return (
      <TimeEntryAuditEventList
        events={auditEvents}
        tasks={tasks}
        projects={[{ id: item.projectId, name: item.projectName }]}
      />
    );
  }
  return (
    <PeriodEntryList
      logs={visibleLogs}
      tasks={tasks}
      timezone={timezone}
      hiddenLogCount={hiddenLogCount}
    />
  );
}

export function PendingActivity({
  item,
  workspaceId,
  timezone,
  layout = "card"
}: {
  item: ActivityItem;
  workspaceId: string;
  timezone?: string;
  /** Table expand already discloses the row — skip the nested toggle. */
  layout?: "card" | "table";
}) {
  const isTable = layout === "table";
  const [open, setOpen] = useState(isTable);
  const [logs, setLogs] = useState<TimeLogDto[]>([]);
  const [auditEvents, setAuditEvents] = useState<TimeEntryAuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const { data: tasks = [] } = useTasksListQuery(
    workspaceId,
    { projectId: item.projectId },
    open && Boolean(workspaceId)
  );

  useEffect(() => {
    if (!open || !workspaceId) return;

    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({
      userId: item.userId,
      projectId: item.projectId,
      from: item.periodStart,
      to: item.periodEnd
    });

    void api<ListTimeLogsResponseDto>(`${ROUTES.TIMELOGS.LIST}?${params}`, { workspaceId })
      .then(async (res) => {
        if (cancelled) return;

        const periodLogs = sortLogsByStartDesc(res.items);
        setLogs(periodLogs);

        const visibleForAudit = periodLogs.slice(0, 8);
        const auditByLog = await Promise.all(
          visibleForAudit.map((log) =>
            api<ListTimelogAuditEventsResponseDto>(ROUTES.TIMELOGS.AUDIT_EVENTS(log.id), {
              workspaceId
            })
              .then((response) => response.items)
              .catch(() => [])
          )
        );

        if (!cancelled) {
          setAuditEvents(mergeAuditEvents(auditByLog));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, workspaceId, item]);

  const body = (
    <PeriodEntryActivityBody
      loading={loading}
      logs={logs}
      auditEvents={auditEvents}
      tasks={tasks}
      item={item}
      timezone={timezone}
    />
  );

  if (isTable) {
    return (
      <div
        data-testid="period-entry-activity"
        data-layout="table"
        className="min-w-0 w-full space-y-3 whitespace-normal bg-muted/10 p-4 text-left"
      >
        {body}
      </div>
    );
  }

  return (
    <div data-testid="period-entry-activity" data-layout="card" className="min-w-0 space-y-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 justify-start px-1 text-xs"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide entry activity" : "View entry activity"}
      </Button>
      <div
        className={cn(
          "grid min-w-0 transition-[grid-template-rows] duration-[var(--motion-base)] ease-[var(--motion-ease-out)] motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-w-0 overflow-hidden">
          <div className="max-h-48 space-y-3 overflow-y-auto overflow-x-hidden whitespace-normal pr-1 pt-2">
            {body}
          </div>
        </div>
      </div>
    </div>
  );
}
