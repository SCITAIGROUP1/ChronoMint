"use client";

import { ROUTES } from "@kloqra/contracts";
import { Button, CenteredLoader, EmptyState } from "@kloqra/ui";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { JiraSubNav } from "./jira-sub-nav";
import { jiraStatusColor } from "./jira-utils";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";

type Issue = {
  id: string;
  jiraIssueKey: string;
  summary: string;
  status: string;
  issueType: string;
  priority: string | null;
  assigneeId: string | null;
  sprintName: string | null;
  cachedAt: string;
};

type PagedResponse = { items: Issue[]; total: number; page: number; totalPages: number };

export function JiraIssuesPage() {
  const wsId = useSessionStore((s) => s.session?.workspaceId) ?? "";
  const [data, setData] = useState<PagedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = (pg = 1, q = search) => {
    if (!wsId) return;
    setLoading(true);
    const params = new URLSearchParams({
      page: String(pg),
      limit: "25",
      ...(q ? { search: q } : {})
    });
    api<PagedResponse>(`${ROUTES.JIRA.ISSUES}?${params.toString()}`, { workspaceId: wsId })
      .then(setData)
      .catch(() => toast.error("Failed to load issues"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [wsId]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api<{ synced: number }>(ROUTES.JIRA.PROJECTS_SYNC, {
        method: "POST",
        workspaceId: wsId
      });
      toast.success(`Synced ${res.synced} issues`);
      load();
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const statusColor = jiraStatusColor;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Jira Issues</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cached issues synced from your mapped Jira projects.
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`mr-2 size-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : "Sync Now"}
        </Button>
      </div>

      <JiraSubNav />

      <div className="flex gap-3">
        <input
          className="rounded border bg-background px-3 py-2 text-sm w-72"
          placeholder="Search issues…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setPage(1);
              load(1, search);
            }
          }}
        />
      </div>

      {loading ? (
        <CenteredLoader />
      ) : !data?.items.length ? (
        <EmptyState
          title="No issues found"
          description="Sync your projects first to import Jira issues."
        />
      ) : (
        <>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Key</th>
                  <th className="px-4 py-3 text-left font-medium">Summary</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Sprint</th>
                  <th className="px-4 py-3 text-left font-medium">Cached</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((issue) => (
                  <tr key={issue.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-primary">
                      {issue.jiraIssueKey}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate">{issue.summary}</td>
                    <td className="px-4 py-3 text-muted-foreground">{issue.issueType}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(issue.status)}`}
                      >
                        {issue.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {issue.sprintName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(issue.cachedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {data.page} of {data.totalPages} ({data.total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page <= 1}
                  onClick={() => {
                    setPage((p) => p - 1);
                    load(page - 1);
                  }}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page >= data.totalPages}
                  onClick={() => {
                    setPage((p) => p + 1);
                    load(page + 1);
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
