"use client";

import { ROUTES } from "@kloqra/contracts";
import type { TeamMembersOverviewDto } from "@kloqra/contracts";
import { useProjectsListQuery } from "@kloqra/web-shared";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

export type ApprovalsFilterOption = {
  value: string;
  label: string;
};

export function useApprovalsFilterOptions(workspaceId: string, enabled = true) {
  const { data: projectRows = [], isLoading: projectsLoading } = useProjectsListQuery(
    workspaceId,
    enabled && Boolean(workspaceId)
  );
  const [members, setMembers] = useState<ApprovalsFilterOption[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !workspaceId) return;
    setMembersLoading(true);
    void api<TeamMembersOverviewDto>(
      `${ROUTES.WORKSPACES.MEMBERS_OVERVIEW(workspaceId)}?page=1&limit=100`,
      { workspaceId }
    )
      .then((overview) => {
        setMembers(
          (overview.members ?? []).map((member) => ({
            value: member.userId,
            label: member.userName
          }))
        );
      })
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
  }, [enabled, workspaceId]);

  const projects = useMemo(
    () => projectRows.filter((p) => p.timesheetApprovalEnabled && p.isActive),
    [projectRows]
  );

  const projectOptions = useMemo(
    (): ApprovalsFilterOption[] =>
      projects
        .map((project) => ({ value: project.id, label: project.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [projects]
  );

  return { projectOptions, memberOptions: members, loading: projectsLoading || membersLoading };
}
