"use client";

import { ROUTES, type ListTimeLogOccupancyResponseDto } from "@kloqra/contracts";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { readUserIdFromToken } from "../auth/jwt-payload";
import { useSessionStore } from "../stores/session.store";
import { occupancyQueryKeys } from "./occupancy-query-keys";

function useOccupancyQueryEnabled(
  workspaceId: string,
  from: string | undefined,
  to: string | undefined,
  enabled: boolean
): boolean {
  const sessionUserId = useSessionStore((s) => s.session?.user?.id);
  const accessToken = useSessionStore((s) => s.accessToken);
  const tokenUserId = readUserIdFromToken(accessToken);
  return Boolean(
    enabled &&
    workspaceId &&
    from &&
    to &&
    sessionUserId &&
    tokenUserId &&
    sessionUserId === tokenUserId
  );
}

export function buildOccupancyPath(from: string, to: string): string {
  const params = new URLSearchParams({ from, to });
  return `${ROUTES.TIMELOGS.OCCUPANCY}?${params}`;
}

export function useTimelogOccupancyQuery(
  workspaceId: string,
  from: string | undefined,
  to: string | undefined,
  enabled = true
) {
  const queryEnabled = useOccupancyQueryEnabled(workspaceId, from, to, enabled);

  return useQuery({
    queryKey:
      from && to
        ? occupancyQueryKeys.range(workspaceId, from, to)
        : occupancyQueryKeys.workspace(workspaceId),
    queryFn: ({ signal }) =>
      api<ListTimeLogOccupancyResponseDto>(buildOccupancyPath(from!, to!), {
        workspaceId,
        signal
      }).then((res) => res.items),
    enabled: queryEnabled,
    staleTime: 0,
    refetchOnMount: "always"
  });
}
