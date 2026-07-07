import type { ListTimeLogsResponseDto } from "@kloqra/contracts";
import { getQueryClient } from "./query-client";
import { timelogQueryKeys } from "./timelog-query-keys";

export async function invalidateTimelogQueries(workspaceId?: string): Promise<void> {
  const client = getQueryClient();
  const queryKey = workspaceId ? timelogQueryKeys.workspace(workspaceId) : timelogQueryKeys.all;
  await client.invalidateQueries({ queryKey, refetchType: "active" });
}

export type TimelogListQueryResult = ListTimeLogsResponseDto;
