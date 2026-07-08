export const occupancyQueryKeys = {
  all: ["occupancy"] as const,
  workspace: (workspaceId: string) => [...occupancyQueryKeys.all, workspaceId] as const,
  range: (workspaceId: string, from: string, to: string) =>
    [...occupancyQueryKeys.workspace(workspaceId), from, to] as const
};
