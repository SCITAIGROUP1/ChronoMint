"use client";

import { PROJECT_COLORS, ROUTES } from "@kloqra/contracts";
import type { ProjectSummaryDto } from "@kloqra/contracts";
import { MemberProjectColorPicker } from "@kloqra/ui";
import { ProjectOverviewStats } from "@kloqra/web-shared";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useProjectDetail } from "./project-detail-context";
import { useIsImpersonating } from "@/hooks/use-is-impersonating";
import { api } from "@/lib/api";

export function PersonalProjectOverview() {
  const { workspaceId, projectId, project, setProject } = useProjectDetail();
  const [savingColor, setSavingColor] = useState(false);
  const isImpersonating = useIsImpersonating();
  const loadSummary = useCallback(
    async (from: string, to: string) => {
      const query = new URLSearchParams({ from, to });
      return api<ProjectSummaryDto>(
        `${ROUTES.REPORTING.PROJECT_SUMMARY(projectId)}?${query.toString()}`,
        { workspaceId }
      );
    },
    [projectId, workspaceId]
  );

  if (!project) return null;

  async function updateColor(color?: string) {
    if (isImpersonating) return;
    setSavingColor(true);
    try {
      await api(ROUTES.USERS.PROJECT_COLOR(projectId), {
        method: color ? "PUT" : "DELETE",
        workspaceId,
        ...(color ? { body: JSON.stringify({ color }) } : {})
      });
      setProject({ ...project!, myColor: color ?? null });
      toast.success(color ? "Your project color was updated." : "Using the default project color.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update project color.");
    } finally {
      setSavingColor(false);
    }
  }

  return (
    <div className="space-y-8" data-testid="personal-project-overview">
      <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
        <MemberProjectColorPicker
          value={project.myColor ?? project.color}
          onChange={(color) => void updateColor(color)}
          colors={PROJECT_COLORS}
          onClear={project.myColor ? () => void updateColor() : undefined}
          disabled={isImpersonating || savingColor}
        />
      </div>
      <ProjectOverviewStats
        mode="member"
        loadSummary={loadSummary}
        projectInceptionDate={project.createdAt}
      />
    </div>
  );
}
