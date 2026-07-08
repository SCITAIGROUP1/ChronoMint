"use client";

import {
  DEFAULT_TABLE_PAGE_SIZE,
  type PaginatedResponse,
  type WorkspaceDataInvalidateScope
} from "@kloqra/contracts";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchPaginatedList } from "../api/fetch-list-items";
import { paginatedListQueryKeys } from "../query/paginated-list-query-keys";
import { getQueryClient } from "../query/query-client";
import { useSessionGeneration } from "./use-session-generation";
import { useWorkspaceStaleRefetch } from "./use-workspace-stale-refetch";

type UsePaginatedListOptions = {
  enabled?: boolean;
  workspaceId: string;
  basePath: string;
  filters?: Record<string, string | undefined>;
  debounceMs?: number;
  /** Refetch when the user returns to this browser tab. */
  refreshOnFocus?: boolean;
  /** Refetch when a realtime notification invalidates these scopes. */
  refreshOnStaleScopes?: WorkspaceDataInvalidateScope[];
};

function shouldKeepPreviousPage(
  previousKey: readonly unknown[] | undefined,
  nextKey: readonly unknown[]
): boolean {
  if (!previousKey) return false;
  return (
    previousKey[1] === nextKey[1] && previousKey[2] === nextKey[2] && previousKey[7] === nextKey[7]
  );
}

export function usePaginatedList<T>({
  enabled = true,
  workspaceId,
  basePath,
  filters,
  debounceMs = 300,
  refreshOnFocus = false,
  refreshOnStaleScopes
}: UsePaginatedListOptions) {
  const sessionGeneration = useSessionGeneration();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const filterKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);
  const stableFilters = useMemo(
    () => filters,
    // filterKey captures serialized filter values; ignore unstable object identity from callers.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by filterKey
    [filterKey]
  );

  useEffect(() => {
    setPage(1);
    setSearch("");
    setDebouncedSearch("");
  }, [sessionGeneration]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), debounceMs);
    return () => clearTimeout(timer);
  }, [search, debounceMs]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterKey]);

  const setLimitAndResetPage = useCallback((nextLimit: number) => {
    setPage(1);
    setLimit(nextLimit);
  }, []);

  const queryKey = paginatedListQueryKeys.list(
    workspaceId,
    basePath,
    page,
    limit,
    debouncedSearch,
    filterKey,
    sessionGeneration
  );

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      fetchPaginatedList<T>(basePath, {
        workspaceId,
        page,
        limit,
        search: debouncedSearch,
        filters: stableFilters,
        signal
      }),
    enabled: enabled && Boolean(workspaceId),
    staleTime: 0,
    refetchOnMount: "always",
    placeholderData: (previousData, previousQuery) =>
      shouldKeepPreviousPage(previousQuery?.queryKey, queryKey) ? previousData : undefined
  });

  const reload = useCallback(async () => {
    await refetch();
  }, [refetch]);

  useEffect(() => {
    if (!refreshOnFocus || !enabled || !workspaceId || typeof window === "undefined") return;

    const run = () => {
      void reload();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
    };

    window.addEventListener("focus", run);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", run);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshOnFocus, enabled, workspaceId, reload]);

  useWorkspaceStaleRefetch(
    workspaceId,
    refreshOnStaleScopes ?? [],
    () => {
      void reload();
    },
    enabled && Boolean(refreshOnStaleScopes?.length)
  );

  const items = data?.items ?? [];
  const total = data?.total ?? items.length;
  const totalPages = data?.totalPages ?? 0;
  const loading = isFetching;
  const error = isError ? "Could not load data." : null;

  return {
    items,
    page,
    setPage,
    search,
    setSearch,
    total,
    totalPages,
    limit,
    setLimit: setLimitAndResetPage,
    loading,
    error,
    reload
  };
}

export type PaginatedListState<T> = PaginatedResponse<T> & {
  loading: boolean;
  error: string | null;
};

/** @internal test helper */
export function resetPaginatedListQueries(): void {
  getQueryClient().removeQueries({ queryKey: paginatedListQueryKeys.all });
}
