import type { ListTimeLogsResponseDto, TimeLogDto } from "@kloqra/contracts";
import { getQueryClient } from "./query-client";
import { timelogQueryKeys } from "./timelog-query-keys";

export type TimelogCachePatch =
  | { type: "upsert"; log: TimeLogDto }
  | { type: "upsertMany"; logs: TimeLogDto[] }
  | { type: "remove"; logId: string };

/** True when a timelog start falls inside a list query's from/to window (if present). */
export function timelogMatchesListQueryPath(log: TimeLogDto, path: string): boolean {
  const query = path.includes("?") ? path.slice(path.indexOf("?")) : "";
  if (!query) return true;

  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  const from = params.get("from");
  const to = params.get("to");
  if (!from || !to) return true;

  const startMs = new Date(log.startTime).getTime();
  if (Number.isNaN(startMs)) return true;

  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return true;

  return startMs >= fromMs && startMs <= toMs;
}

function listPathFromQueryKey(key: readonly unknown[]): string | null {
  const path = key[2];
  return typeof path === "string" ? path : null;
}

function patchListData(
  data: ListTimeLogsResponseDto | undefined,
  patch: (items: TimeLogDto[]) => TimeLogDto[]
): ListTimeLogsResponseDto {
  const items = data?.items ?? [];
  return { ...(data ?? { items: [] }), items: patch(items) };
}

function forEachTimelogListQuery(
  workspaceId: string,
  apply: (key: readonly unknown[], path: string, data: ListTimeLogsResponseDto | undefined) => void
): void {
  const client = getQueryClient();
  const queries = client.getQueryCache().findAll({
    queryKey: timelogQueryKeys.workspace(workspaceId)
  });

  for (const query of queries) {
    const key = query.queryKey;
    const path = listPathFromQueryKey(key);
    if (!path) continue;
    const data = client.getQueryData<ListTimeLogsResponseDto>(key);
    apply(key, path, data);
  }
}

/** Immediately reflect a created/updated timelog in all cached list queries for a workspace. */
export function upsertTimelogInListCaches(workspaceId: string, log: TimeLogDto): void {
  const client = getQueryClient();

  forEachTimelogListQuery(workspaceId, (key, path, data) => {
    if (!timelogMatchesListQueryPath(log, path)) return;
    client.setQueryData(
      key,
      patchListData(data, (items) => {
        const index = items.findIndex((item) => item.id === log.id);
        if (index === -1) return [log, ...items];
        return items.map((item, i) => (i === index ? log : item));
      })
    );
  });
}

/** Immediately remove a deleted timelog from all cached list queries for a workspace. */
export function removeTimelogFromListCaches(workspaceId: string, logId: string): void {
  const client = getQueryClient();

  forEachTimelogListQuery(workspaceId, (key, _path, data) => {
    client.setQueryData(
      key,
      patchListData(data, (items) => items.filter((item) => item.id !== logId))
    );
  });
}

export function applyTimelogCachePatch(workspaceId: string, patch: TimelogCachePatch): void {
  switch (patch.type) {
    case "upsert":
      upsertTimelogInListCaches(workspaceId, patch.log);
      return;
    case "upsertMany":
      for (const log of patch.logs) {
        upsertTimelogInListCaches(workspaceId, log);
      }
      return;
    case "remove":
      removeTimelogFromListCaches(workspaceId, patch.logId);
  }
}
