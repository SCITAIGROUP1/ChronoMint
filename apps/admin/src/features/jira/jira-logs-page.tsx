"use client";

import { ROUTES } from "@kloqra/contracts";
import { CenteredLoader, EmptyState } from "@kloqra/ui";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { JiraSubNav } from "./jira-sub-nav";
import { jiraSyncLogStatusColor } from "./jira-utils";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";

type SyncLog = {
  id: string;
  operation: string;
  entityType: string;
  entityId: string | null;
  status: string;
  message: string | null;
  createdAt: string;
};

type PagedResponse = { items: SyncLog[]; total: number; page: number; totalPages: number };

export function JiraLogsPage() {
  const wsId = useSessionStore((s) => s.session?.workspaceId) ?? "";
  const [data, setData] = useState<PagedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const load = (pg = 1, status = statusFilter) => {
    if (!wsId) return;
    setLoading(true);
    const params = new URLSearchParams({
      page: String(pg),
      limit: "50",
      ...(status ? { status } : {})
    });
    api<PagedResponse>(`${ROUTES.JIRA.LOGS}?${params.toString()}`, { workspaceId: wsId })
      .then(setData)
      .catch(() => toast.error("Failed to load sync logs"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [wsId]);

  const statusColor = jiraSyncLogStatusColor;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Sync Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Audit trail of all Jira sync operations.
        </p>
      </div>

      <JiraSubNav />

      <div className="flex gap-3">
        <select
          className="rounded border bg-background px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            load(1, e.target.value);
          }}
        >
          <option value="">All statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="PARTIAL">Partial</option>
        </select>
      </div>

      {loading ? (
        <CenteredLoader />
      ) : !data?.items.length ? (
        <EmptyState title="No sync logs yet" description="Sync activity will be recorded here." />
      ) : (
        <>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Time</th>
                  <th className="px-4 py-3 text-left font-medium">Operation</th>
                  <th className="px-4 py-3 text-left font-medium">Entity</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{log.operation}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {log.entityType}
                      {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(log.status)}`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate"
                      title={log.message ?? ""}
                    >
                      {log.message ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 text-sm">
              <span className="text-muted-foreground">
                Page {data.page} / {data.totalPages}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
