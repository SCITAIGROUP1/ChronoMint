"use client";

import type { TaskDto } from "@kloqra/contracts";
import { ROUTES, jiraIssueKeySchema } from "@kloqra/contracts";
import { fetchListItems, resolveJiraIssue } from "@kloqra/web-shared";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type UseJiraIssueDeepLinkOptions = {
  workspaceId: string;
  tracking: boolean;
  onResolved: (result: { projectId: string; taskId: string; taskName: string }) => void;
  refreshTasks: (tasks: TaskDto[]) => void;
};

export function useJiraIssueDeepLink({
  workspaceId,
  tracking,
  onResolved,
  refreshTasks
}: UseJiraIssueDeepLinkOptions) {
  const searchParams = useSearchParams();
  const jiraIssue = searchParams.get("jiraIssue")?.trim().toUpperCase() ?? null;
  const processedRef = useRef<string | null>(null);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (!workspaceId || !jiraIssue || tracking) return;
    if (processedRef.current === jiraIssue) return;

    const parsed = jiraIssueKeySchema.safeParse(jiraIssue);
    if (!parsed.success) {
      toast.error("Invalid Jira issue key in link");
      processedRef.current = jiraIssue;
      return;
    }

    let cancelled = false;
    setLinking(true);

    void resolveJiraIssue(workspaceId, parsed.data)
      .then(async (result) => {
        if (cancelled) return;
        processedRef.current = jiraIssue;
        const tasks = await fetchListItems<TaskDto>(ROUTES.TASKS.LIST, { workspaceId });
        refreshTasks(tasks);
        onResolved({
          projectId: result.projectId,
          taskId: result.taskId,
          taskName: result.taskName
        });
        toast.success(`Ready to track ${result.issueKey}: ${result.taskName}`);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        processedRef.current = jiraIssue;
        toast.error(err instanceof Error ? err.message : "Could not link Jira issue");
      })
      .finally(() => {
        if (!cancelled) setLinking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, jiraIssue, tracking, onResolved, refreshTasks]);

  return { jiraIssue, linking };
}
