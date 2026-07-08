"use client";

import { ROUTES, type WorkspaceListItemDto } from "@kloqra/contracts";
import { useQuery } from "@tanstack/react-query";
import { readUserIdFromToken } from "../auth/jwt-payload";
import { useSessionStore } from "../stores/session.store";
import { fetchCatalogList } from "./use-catalog-queries";

export const workspaceListQueryKeys = {
  all: ["workspace-list"] as const,
  context: (workspaceId: string) => [...workspaceListQueryKeys.all, workspaceId] as const,
  accessible: (workspaceId: string) =>
    [...workspaceListQueryKeys.context(workspaceId), "accessible"] as const,
  tenant: (workspaceId: string) =>
    [...workspaceListQueryKeys.context(workspaceId), "tenant"] as const
};

function useWorkspaceListQueryEnabled(workspaceId: string, enabled: boolean): boolean {
  const sessionUserId = useSessionStore((s) => s.session?.user?.id);
  const accessToken = useSessionStore((s) => s.accessToken);
  const tokenUserId = readUserIdFromToken(accessToken);
  return Boolean(
    enabled && workspaceId && sessionUserId && tokenUserId && sessionUserId === tokenUserId
  );
}

/** Workspaces the current user can access (admin assign dialog). */
export function useAccessibleWorkspacesListQuery(workspaceId: string, enabled = true) {
  const queryEnabled = useWorkspaceListQueryEnabled(workspaceId, enabled);

  return useQuery({
    queryKey: workspaceListQueryKeys.accessible(workspaceId),
    queryFn: () => fetchCatalogList<WorkspaceListItemDto>(ROUTES.WORKSPACES.LIST, workspaceId),
    enabled: queryEnabled,
    staleTime: 0,
    refetchOnMount: "always"
  });
}

/** Tenant workspaces for org-level admin screens. */
export function useTenantWorkspacesListQuery(workspaceId: string, enabled = true) {
  const queryEnabled = useWorkspaceListQueryEnabled(workspaceId, enabled);

  return useQuery({
    queryKey: workspaceListQueryKeys.tenant(workspaceId),
    queryFn: () => fetchCatalogList<WorkspaceListItemDto>(ROUTES.TENANTS.WORKSPACES, workspaceId),
    enabled: queryEnabled,
    staleTime: 0,
    refetchOnMount: "always"
  });
}
