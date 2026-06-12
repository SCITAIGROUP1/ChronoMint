"use client";

import { ROUTES } from "@kloqra/contracts";
import { Button, CenteredLoader, EmptyState } from "@kloqra/ui";
import { ArrowUpRight, RefreshCw, Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  projectKey: string | null;
  projectName: string | null;
  jiraUrl: string;
};

export function JiraMyIssuesPage() {
  const session = useSessionStore((s) => s.session);
  const wsId = session?.workspaceId ?? "";

  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>("all");

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

  const projects = useMemo(() => {
    const seen = new Map<string, string>();
    for (const i of issues) {
      const key = i.projectKey ?? "unknown";
      if (!seen.has(key)) seen.set(key, i.projectName ?? key);
    }
    return Array.from(seen.entries()).map(([key, name]) => ({ key, name }));
  }, [issues]);

  const filtered =
    selectedProject === "all" ? issues : issues.filter((i) => i.projectKey === selectedProject);

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; issues: JiraIssue[] }>();
    for (const issue of filtered) {
      const key = issue.projectKey ?? "unknown";
      const name = issue.projectName ?? key;
      if (!map.has(key)) map.set(key, { name, issues: [] });
      map.get(key)!.issues.push(issue);
    }
    return Array.from(map.values());
  }, [filtered]);

  const statusColor = jiraStatusColor;
  const priorityColor = jiraPriorityColor;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Jira Issues</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Issues assigned to you, grouped by project.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 size-3.5" />
          Refresh
        </Button>
      </div>

      {projects.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedProject("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              selectedProject === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            All Projects
          </button>
          {projects.map((p) => (
            <button
              key={p.key}
              onClick={() => setSelectedProject(p.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                selectedProject === p.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <CenteredLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={issues.length === 0 ? "No Jira issues found" : "No issues in this project"}
          description={
            issues.length === 0
              ? "Link your Jira account in Settings → Jira Account, then sync."
              : "Try selecting a different project."
          }
        />
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.name}>
              <h2 className="mb-3 text-base font-semibold text-foreground border-b pb-2">
                {group.name}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({group.issues.length})
                </span>
              </h2>
              <div className="space-y-2">
                {group.issues.map((issue) => (
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
                          toast.info(`Start timer for ${issue.jiraIssueKey}`);
                        }}
                      >
                        <Timer className="mr-1.5 size-3.5" />
                        Start Timer
                      </Button>
                      <a
                        href={issue.jiraUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md border border-input bg-background p-2 hover:bg-muted transition-colors"
                        title="Open in Jira"
                      >
                        <ArrowUpRight className="size-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
