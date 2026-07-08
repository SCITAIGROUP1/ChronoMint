"use client";

import { useCallback, useMemo } from "react";
import {
  useCategoriesListQuery,
  useProjectsListQuery,
  useTasksListQuery
} from "./use-catalog-queries";

type CatalogFilters = Record<string, string | string[] | number | boolean | undefined | null>;

function filtersKey(filters?: CatalogFilters): string {
  if (!filters) return "";
  return Object.keys(filters)
    .sort()
    .map((key) => `${key}=${String(filters[key] ?? "")}`)
    .join("&");
}

/** Projects, tasks, and categories via React Query — live-updates via workspace scope sync. */
export function useEntryCatalogQueries(
  workspaceId: string,
  options?: {
    taskFilters?: CatalogFilters;
    enabled?: boolean;
  }
) {
  const enabled = options?.enabled ?? Boolean(workspaceId);
  const taskFilters = options?.taskFilters;
  const filterKey = useMemo(() => filtersKey(taskFilters), [taskFilters]);

  const projectsQuery = useProjectsListQuery(workspaceId, enabled);
  const categoriesQuery = useCategoriesListQuery(workspaceId, enabled);
  const tasksQuery = useTasksListQuery(workspaceId, taskFilters, enabled);

  const refetch = useCallback(async () => {
    await Promise.all([projectsQuery.refetch(), categoriesQuery.refetch(), tasksQuery.refetch()]);
  }, [projectsQuery, categoriesQuery, tasksQuery]);

  return {
    projects: projectsQuery.data ?? [],
    categories: categoriesQuery.data ?? [],
    tasks: tasksQuery.data ?? [],
    isLoading: projectsQuery.isLoading || categoriesQuery.isLoading || tasksQuery.isLoading,
    isFetching: projectsQuery.isFetching || categoriesQuery.isFetching || tasksQuery.isFetching,
    refetch,
    filterKey
  };
}
