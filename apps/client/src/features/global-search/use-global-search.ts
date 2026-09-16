"use client";

import { useWorkspaceRemoteQuery } from "@kloqra/web-shared";
import { useEffect, useState } from "react";
import {
  EMPTY_ENTITY_RESULTS,
  fetchGlobalSearchEntities,
  type GlobalSearchEntityResults
} from "./global-search-api";
import { GLOBAL_SEARCH_DEBOUNCE_MS, GLOBAL_SEARCH_MIN_QUERY_LENGTH } from "./global-search-nav";

export function useGlobalSearch(workspaceId: string, query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), GLOBAL_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const trimmed = debouncedQuery.trim();
  const shouldSearchEntities = trimmed.length >= GLOBAL_SEARCH_MIN_QUERY_LENGTH;

  const { data: entityResults = EMPTY_ENTITY_RESULTS, isFetching } =
    useWorkspaceRemoteQuery<GlobalSearchEntityResults>(
      workspaceId,
      ["global-search", workspaceId, trimmed],
      () => fetchGlobalSearchEntities(workspaceId, trimmed),
      shouldSearchEntities
    );

  return {
    debouncedQuery,
    loading: isFetching && shouldSearchEntities,
    entityResults,
    shouldSearchEntities
  };
}
