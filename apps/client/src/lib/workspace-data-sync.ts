"use client";

import { ROUTES, type ProjectDto } from "@kloqra/contracts";
import {
  fetchListItems,
  invalidateListItemsCache,
  WORKSPACE_DATA_STALE_EVENT,
  type WorkspaceDataStaleDetail
} from "@kloqra/web-shared";
import { useEffect } from "react";
import { useMySubmissionsStore } from "@/stores/member-data.store";
import { useProjectsStore } from "@/stores/projects.store";

export function useClientWorkspaceDataSync(workspaceId: string) {
  useEffect(() => {
    if (!workspaceId) return;

    const onStale = (event: Event) => {
      const detail = (event as CustomEvent<WorkspaceDataStaleDetail>).detail;
      if (!detail || detail.workspaceId !== workspaceId) return;

      if (detail.scopes.includes("submissions") || detail.scopes.includes("timesheet")) {
        useMySubmissionsStore.getState().invalidate(workspaceId);
      }
      if (detail.scopes.includes("projects")) {
        invalidateListItemsCache({ workspaceId });
        void fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, {
          workspaceId,
          bypassCache: true
        }).then((items) => {
          useProjectsStore.getState().setProjects(items);
        });
      }
    };

    window.addEventListener(WORKSPACE_DATA_STALE_EVENT, onStale);
    return () => window.removeEventListener(WORKSPACE_DATA_STALE_EVENT, onStale);
  }, [workspaceId]);
}
