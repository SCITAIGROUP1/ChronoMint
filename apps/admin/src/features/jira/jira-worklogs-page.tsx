"use client";

import { ROUTES } from "@kloqra/contracts";
import { Button, CenteredLoader, EmptyState } from "@kloqra/ui";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { JiraSubNav } from "./jira-sub-nav";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";

type WorklogEntry = {
  id: string;
  timeLogId: string;
  jiraIssueKey: string;
  jiraWorklogId: string | null;
  status: string;
  errorMessage: string | null;
  syncedAt: string | null;
  createdAt: string;
  timeLog: { startTime: string; durationSec: number; description?: string };
};

type PagedResponse = { items: WorklogEntry[]; total: number; page: number; totalPages: number };

export function JiraWorklogsPage() {
  const wsId = useSessionStore((s) => s.session?.workspaceId) ?? "";
  const [data, setData] = useState<PagedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = (pg = 1) => {
    if (!wsId) return;
    setLoading(true);
    api<PagedResponse>(`${ROUTES.JIRA.WORKLOGS}?page=${pg}&limit=25`, { workspaceId: wsId })
      .then(setData)
      .catch(() => toast.error("Failed to load worklogs"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [wsId]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api<{ pushed: number; failed: number }>(ROUTES.JIRA.WORKLOGS_SYNC, {
        method: "POST",
        workspaceId: wsId
      });
      toast.success(`Pushed ${res.pushed} worklogs${res.failed ? `, ${res.failed} failed` : ""}`);
      load();
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const statusColor = (status: string) => {
    if (status === "SYNCED")
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    if (status === "FAILED") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    if (status === "PENDING")
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    return "bg-muted text-muted-foreground";
  };

  const fmt = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Worklog Sync</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Time entries pending or synced to Jira as worklogs.
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`mr-2 size-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Pushing…" : "Push Pending to Jira"}
        </Button>
      </div>

      <JiraSubNav />

      {loading ? (
        <CenteredLoader />
      ) : !data?.items.length ? (
        <EmptyState
          title="No worklog sync records"
          description="Time entries linked to Jira issues will appear here."
        />
      ) : (
        <>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Jira Issue</th>
                  <th className="px-4 py-3 text-left font-medium">Duration</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Synced</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-primary">
                      {entry.jiraIssueKey}
                    </td>
                    <td className="px-4 py-3">{fmt(entry.timeLog.durationSec)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(entry.timeLog.startTime).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(entry.status)}`}
                      >
                        {entry.status}
                      </span>
                      {entry.errorMessage && (
                        <p
                          className="mt-1 text-xs text-red-600 dark:text-red-400 max-w-xs truncate"
                          title={entry.errorMessage}
                        >
                          {entry.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {entry.syncedAt ? new Date(entry.syncedAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 text-sm">
              <Button
                variant="outline"
                size="sm"
                disabled={data.page <= 1}
                onClick={() => load(data.page - 1)}
              >
                Previous
              </Button>
              <span className="text-muted-foreground">
                Page {data.page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={data.page >= data.totalPages}
                onClick={() => load(data.page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
