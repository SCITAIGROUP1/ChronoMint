"use client";

import { ROUTES } from "@kloqra/contracts";
import { Button, CenteredLoader, EmptyState } from "@kloqra/ui";
import { ExternalLink, RefreshCw, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { jiraPriorityColor, jiraStatusColor } from "./jira-utils";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";

type JiraIssue = {
  jiraIssueId: string;
  jiraIssueKey: string;
  summary: string;
  status: string;
  issueType: string;
  priority: string | null;
  sprintName: string | null;
  storyPoints: number | null;
};

export function JiraMyIssuesPage() {
  const session = useSessionStore((s) => s.session);
  const wsId = session?.workspaceId ?? "";

  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = () => {
    if (!wsId) return;
    setLoading(true);
    api<JiraIssue[]>(ROUTES.JIRA.MY_ISSUES, { workspaceId: wsId })
      .then(setIssues)
      .catch(() => toast.error("Failed to load your Jira issues"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [wsId]);

  const filtered = issues.filter(
    (i) =>
      !search ||
      i.summary.toLowerCase().includes(search.toLowerCase()) ||
      i.jiraIssueKey.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = jiraStatusColor;
  const priorityColor = jiraPriorityColor;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Jira Issues</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Issues assigned to you across all connected Jira projects.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 size-3.5" />
          Refresh
        </Button>
      </div>

      <div className="flex gap-3">
        <input
          className="rounded border bg-background px-3 py-2 text-sm w-72"
          placeholder="Search issues…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <CenteredLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={issues.length === 0 ? "No Jira issues found" : "No matching issues"}
          description={
            issues.length === 0
              ? "Make sure your Jira account is connected and user mapping is configured by your admin."
              : "Try a different search term."
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((issue) => (
            <div
              key={issue.jiraIssueId}
              className="flex items-center gap-4 rounded-lg border bg-card p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-semibold text-primary shrink-0">
                    {issue.jiraIssueKey}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(issue.status)}`}
                  >
                    {issue.status}
                  </span>
                  {issue.priority && (
                    <span className={`text-xs font-medium ${priorityColor(issue.priority)}`}>
                      {issue.priority}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium truncate">{issue.summary}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{issue.issueType}</span>
                  {issue.sprintName && <span>Sprint: {issue.sprintName}</span>}
                  {issue.storyPoints !== null && <span>{issue.storyPoints} pts</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    toast.info(
                      `Start timer for ${issue.jiraIssueKey} — timer integration coming next`
                    );
                  }}
                >
                  <Timer className="mr-1.5 size-3.5" />
                  Start Timer
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <a
                    href={`https://jira.atlassian.com/browse/${issue.jiraIssueKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
