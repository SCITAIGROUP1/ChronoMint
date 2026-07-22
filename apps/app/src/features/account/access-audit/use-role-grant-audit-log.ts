import type { RoleGrantAuditPage } from "@kloqra/contracts";
import { ROUTES } from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";

type Filter = {
  scope?: "tenant" | "workspace" | "project";
  outcome?: "GRANTED" | "REVOKED";
  from?: string;
  to?: string;
};

export function useRoleGrantAuditLog(filter: Filter = {}) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [data, setData] = useState<RoleGrantAuditPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ws) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filter.scope) params.set("scope", filter.scope);
      if (filter.outcome) params.set("outcome", filter.outcome);
      if (filter.from) params.set("from", filter.from);
      if (filter.to) params.set("to", filter.to);

      const result = await api<RoleGrantAuditPage>(
        `${ROUTES.TENANTS.ROLE_GRANT_AUDIT}?${params.toString()}`,
        { workspaceId: ws }
      );
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load access audit log.");
    } finally {
      setLoading(false);
    }
  }, [ws, page, limit, filter.scope, filter.outcome, filter.from, filter.to]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filter.scope, filter.outcome, filter.from, filter.to]);

  return {
    events: data?.data ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 1,
    page,
    setPage,
    limit,
    setLimit,
    loading,
    error,
    reload: load
  };
}
