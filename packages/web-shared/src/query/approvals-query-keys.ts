export const approvalsQueryKeys = {
  all: ["approvals"] as const,
  workspace: (workspaceId: string) => [...approvalsQueryKeys.all, workspaceId] as const,
  pending: (workspaceId: string, filterKey: string, sessionGeneration: number) =>
    [
      ...approvalsQueryKeys.workspace(workspaceId),
      "pending",
      filterKey,
      sessionGeneration
    ] as const,
  amendments: (workspaceId: string, filterKey: string, sessionGeneration: number) =>
    [
      ...approvalsQueryKeys.workspace(workspaceId),
      "amendments",
      filterKey,
      sessionGeneration
    ] as const,
  reviewed: (
    workspaceId: string,
    status: "APPROVED" | "REJECTED",
    filterKey: string,
    sessionGeneration: number
  ) =>
    [
      ...approvalsQueryKeys.workspace(workspaceId),
      "reviewed",
      status,
      filterKey,
      sessionGeneration
    ] as const,
  allTimesheets: (workspaceId: string, filterKey: string, sessionGeneration: number) =>
    [...approvalsQueryKeys.workspace(workspaceId), "all", filterKey, sessionGeneration] as const,
  missing: (
    workspaceId: string,
    anchorDate: string,
    filterKey: string,
    sessionGeneration: number
  ) =>
    [
      ...approvalsQueryKeys.workspace(workspaceId),
      "missing",
      anchorDate,
      filterKey,
      sessionGeneration
    ] as const
};
