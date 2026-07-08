"use client";

import { useQuery } from "@tanstack/react-query";
import { readUserIdFromToken } from "../auth/jwt-payload";
import { useSessionGeneration } from "../hooks/use-session-generation";
import { useSessionStore } from "../stores/session.store";

function useWorkspaceQueryEnabled(workspaceId: string, enabled: boolean): boolean {
  const sessionUserId = useSessionStore((s) => s.session?.user?.id);
  const accessToken = useSessionStore((s) => s.accessToken);
  const tokenUserId = readUserIdFromToken(accessToken);
  return Boolean(
    enabled && workspaceId && sessionUserId && tokenUserId && sessionUserId === tokenUserId
  );
}

export function useWorkspaceRemoteQuery<T>(
  workspaceId: string,
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>,
  enabled = true
) {
  const sessionGeneration = useSessionGeneration();
  const queryEnabled = useWorkspaceQueryEnabled(workspaceId, enabled);

  return useQuery({
    queryKey: [...queryKey, sessionGeneration],
    queryFn,
    enabled: queryEnabled,
    staleTime: 0,
    refetchOnMount: "always"
  });
}
