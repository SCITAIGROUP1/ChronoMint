"use client";

import { Card, CardContent, CardHeader, CardTitle, ProjectColorDot } from "@kloqra/ui";
import { useProjectsListQuery, useWeekSummaryQuery } from "@kloqra/web-shared";
import { colorForProject } from "@/lib/project-color-styles";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export function MyWeekSummary() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { data: summary } = useWeekSummaryQuery(ws, Boolean(ws));
  const { data: projects = [] } = useProjectsListQuery(ws, Boolean(ws));

  if (!summary) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">My week</CardTitle>
        <p className="text-xs text-muted-foreground">
          {summary.weekStart} – {summary.weekEnd}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-muted-foreground">Today</p>
            <p className="text-lg font-semibold">{summary.todayHours}h</p>
          </div>
          <div>
            <p className="text-muted-foreground">This week</p>
            <p className="text-lg font-semibold">{summary.weekTotalHours}h</p>
          </div>
          <div>
            <p className="text-muted-foreground">Billable this week</p>
            <p className="text-lg font-semibold">{summary.weekBillableHours}h</p>
          </div>
        </div>
        {summary.byProject.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {summary.byProject.map((p) => (
              <li key={p.projectId} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <ProjectColorDot
                    color={colorForProject(p.projectId, projects, p.projectColor)}
                    size="md"
                  />
                  <span className="truncate font-medium">{p.projectName}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{p.totalHours}h</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No time logged this week yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
