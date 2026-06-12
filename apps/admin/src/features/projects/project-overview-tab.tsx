"use client";

import { ROUTES } from "@kloqra/contracts";
import type { ProjectSummaryDto } from "@kloqra/contracts";
import { ProjectOverviewStats } from "@kloqra/web-shared";
import { useCallback } from "react";
import { api } from "@/lib/api";

type Props = {
  workspaceId: string;
  projectId: string;
};

export function ProjectOverviewTab({ workspaceId, projectId }: Props) {
  const loadSummary = useCallback(
    async (from: string, to: string) => {
      const params = new URLSearchParams({ from, to });
      return api<ProjectSummaryDto>(
        `${ROUTES.REPORTING.PROJECT_SUMMARY(projectId)}?${params.toString()}`,
        { workspaceId }
      );
    },
    [workspaceId, projectId]
  );

  return <ProjectOverviewStats mode="admin" loadSummary={loadSummary} />;
}
