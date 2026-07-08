"use client";

import {
  ROUTES,
  type ListTimesheetSubmissionsResponseDto,
  type MyWeekSummaryDto
} from "@kloqra/contracts";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { readUserIdFromToken } from "../auth/jwt-payload";
import { useSessionGeneration } from "../hooks/use-session-generation";
import { useSessionStore } from "../stores/session.store";
import { submissionsQueryKeys } from "./submissions-query-keys";
import { weekSummaryQueryKeys } from "./week-summary-query-keys";

function useWorkspaceQueryEnabled(workspaceId: string, enabled: boolean): boolean {
  const sessionUserId = useSessionStore((s) => s.session?.user?.id);
  const accessToken = useSessionStore((s) => s.accessToken);
  const tokenUserId = readUserIdFromToken(accessToken);
  return Boolean(
    enabled && workspaceId && sessionUserId && tokenUserId && sessionUserId === tokenUserId
  );
}

export function useMySubmissionsQuery(
  workspaceId: string,
  path: string,
  queryKey: string,
  enabled = true
) {
  const sessionGeneration = useSessionGeneration();
  const queryEnabled = useWorkspaceQueryEnabled(workspaceId, enabled);

  return useQuery({
    queryKey: [...submissionsQueryKeys.list(workspaceId, queryKey), sessionGeneration],
    queryFn: ({ signal }) =>
      api<ListTimesheetSubmissionsResponseDto>(path, { workspaceId, signal }).then(
        (res) => res.items ?? []
      ),
    enabled: queryEnabled,
    staleTime: 0,
    refetchOnMount: "always"
  });
}

export function useWeekSummaryQuery(workspaceId: string, enabled = true) {
  const sessionGeneration = useSessionGeneration();
  const queryEnabled = useWorkspaceQueryEnabled(workspaceId, enabled);

  return useQuery({
    queryKey: [...weekSummaryQueryKeys.workspace(workspaceId), sessionGeneration],
    queryFn: ({ signal }) => api<MyWeekSummaryDto>(ROUTES.REPORTING.ME, { workspaceId, signal }),
    enabled: queryEnabled,
    staleTime: 0,
    refetchOnMount: "always"
  });
}
