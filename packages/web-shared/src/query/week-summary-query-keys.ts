export const weekSummaryQueryKeys = {
  all: ["weekSummary"] as const,
  workspace: (workspaceId: string) => [...weekSummaryQueryKeys.all, workspaceId] as const
};
