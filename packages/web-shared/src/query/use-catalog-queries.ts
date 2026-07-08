"use client";

import {
  DEFAULT_DROPDOWN_LIST_LIMIT,
  ROUTES,
  type CategoryDto,
  type PaginatedResponse,
  type ProjectDto,
  type TaskDto
} from "@kloqra/contracts";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { normalizePaginatedListResponse } from "../api/fetch-list-items";
import { appendListQuery, buildListQuery } from "../api/list-query";
import { readUserIdFromToken } from "../auth/jwt-payload";
import { useSessionGeneration } from "../hooks/use-session-generation";
import { useSessionStore } from "../stores/session.store";
import { catalogQueryKeys } from "./catalog-query-keys";

type ListApiResponse<T> = T[] | PaginatedResponse<T>;

function useCatalogQueryEnabled(workspaceId: string, enabled: boolean): boolean {
  const sessionUserId = useSessionStore((s) => s.session?.user?.id);
  const accessToken = useSessionStore((s) => s.accessToken);
  const tokenUserId = readUserIdFromToken(accessToken);
  return Boolean(
    enabled && workspaceId && sessionUserId && tokenUserId && sessionUserId === tokenUserId
  );
}

export async function fetchCatalogList<T>(
  path: string,
  workspaceId: string,
  filters?: Record<string, string | string[] | number | boolean | undefined | null>,
  limit = DEFAULT_DROPDOWN_LIST_LIMIT
): Promise<T[]> {
  const query = buildListQuery({ page: 1, limit, filters });
  const res = await api<ListApiResponse<T>>(appendListQuery(path, query), { workspaceId });
  return normalizePaginatedListResponse(res, 1, limit).items;
}

export function useProjectsListQuery(workspaceId: string, enabled = true) {
  const sessionGeneration = useSessionGeneration();
  const queryEnabled = useCatalogQueryEnabled(workspaceId, enabled);

  return useQuery({
    queryKey: [...catalogQueryKeys.projects(workspaceId), sessionGeneration],
    queryFn: () => fetchCatalogList<ProjectDto>(ROUTES.PROJECTS.LIST, workspaceId),
    enabled: queryEnabled,
    staleTime: 0,
    refetchOnMount: "always"
  });
}

export function useCategoriesListQuery(workspaceId: string, enabled = true) {
  const sessionGeneration = useSessionGeneration();
  const queryEnabled = useCatalogQueryEnabled(workspaceId, enabled);

  return useQuery({
    queryKey: [...catalogQueryKeys.categories(workspaceId), sessionGeneration],
    queryFn: () => fetchCatalogList<CategoryDto>(ROUTES.CATEGORIES.LIST, workspaceId),
    enabled: queryEnabled,
    staleTime: 0,
    refetchOnMount: "always"
  });
}

export function useTasksListQuery(
  workspaceId: string,
  filters?: Record<string, string | string[] | number | boolean | undefined | null>,
  enabled = true
) {
  const filterKey = filters
    ? Object.keys(filters)
        .sort()
        .map((key) => `${key}=${String(filters[key] ?? "")}`)
        .join("&")
    : "";
  const queryEnabled = useCatalogQueryEnabled(workspaceId, enabled);
  const sessionGeneration = useSessionGeneration();

  return useQuery({
    queryKey: [...catalogQueryKeys.tasks(workspaceId, filterKey), sessionGeneration],
    queryFn: () => fetchCatalogList<TaskDto>(ROUTES.TASKS.LIST, workspaceId, filters),
    enabled: queryEnabled,
    staleTime: 0,
    refetchOnMount: "always"
  });
}
