"use client";

import { ROUTES, type ProjectDto } from "@kloqra/contracts";
import { fetchPaginatedList } from "@kloqra/web-shared";
import { useEffect, useState } from "react";

/** Workspace project count for the Projects nav badge (scoped to the current user). */
export function useProjectsNavBadgeCount(workspaceId: string, enabled = true): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled || !workspaceId) {
      setCount(0);
      return;
    }

    let cancelled = false;
    void fetchPaginatedList<ProjectDto>(ROUTES.PROJECTS.LIST, {
      workspaceId,
      page: 1,
      limit: 1
    })
      .then((page) => {
        if (!cancelled) setCount(page.total);
      })
      .catch(() => {
        if (!cancelled) setCount(0);
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, enabled]);

  return count;
}
