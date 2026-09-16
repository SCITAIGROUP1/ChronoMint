"use client";

import {
  ROUTES,
  type ListTenantActivityTypesResponseDto,
  type ListTenantHolidaysResponseDto
} from "@kloqra/contracts";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { readUserIdFromToken } from "../auth/jwt-payload";
import { useSessionGeneration } from "../hooks/use-session-generation";
import { useSessionStore } from "../stores/session.store";
import { catalogQueryKeys } from "./catalog-query-keys";

function useEnabled(workspaceId: string, enabled: boolean) {
  const sessionUserId = useSessionStore((s) => s.session?.user?.id);
  const accessToken = useSessionStore((s) => s.accessToken);
  const tokenUserId = readUserIdFromToken(accessToken);
  return Boolean(
    enabled && workspaceId && sessionUserId && tokenUserId && sessionUserId === tokenUserId
  );
}

export function useTenantHolidaysQuery(workspaceId: string, enabled = true) {
  const sessionGeneration = useSessionGeneration();
  return useQuery({
    queryKey: [...catalogQueryKeys.holidays(workspaceId), sessionGeneration],
    queryFn: ({ signal }) =>
      api<ListTenantHolidaysResponseDto>(ROUTES.TIMELOGS.HOLIDAYS, { workspaceId, signal }),
    enabled: useEnabled(workspaceId, enabled),
    staleTime: 60_000
  });
}

export function useTenantActivityTypesQuery(workspaceId: string, enabled = true) {
  const sessionGeneration = useSessionGeneration();
  return useQuery({
    queryKey: [...catalogQueryKeys.activityTypes(workspaceId), sessionGeneration],
    queryFn: ({ signal }) =>
      api<ListTenantActivityTypesResponseDto>(ROUTES.TIMELOGS.ACTIVITY_TYPES, {
        workspaceId,
        signal
      }),
    enabled: useEnabled(workspaceId, enabled),
    staleTime: 60_000
  });
}
