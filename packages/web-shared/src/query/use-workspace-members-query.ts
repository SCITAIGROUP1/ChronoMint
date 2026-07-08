"use client";

import { ROUTES } from "@kloqra/contracts";
import type { WorkspaceMemberDto } from "@kloqra/contracts";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
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

export function useWorkspaceMembersQuery(workspaceId: string, enabled = true) {
  const sessionGeneration = useSessionGeneration();
  const queryEnabled = useWorkspaceQueryEnabled(workspaceId, enabled);

  return useQuery({
    queryKey: ["workspace-members", workspaceId, sessionGeneration],
    queryFn: ({ signal }) =>
      api<WorkspaceMemberDto[]>(ROUTES.WORKSPACES.MEMBERS(workspaceId), {
        workspaceId,
        signal
      }),
    enabled: queryEnabled,
    staleTime: 0,
    refetchOnMount: "always"
  });
}
