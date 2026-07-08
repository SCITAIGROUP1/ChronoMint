export const submissionsQueryKeys = {
  all: ["submissions"] as const,
  workspace: (workspaceId: string) => [...submissionsQueryKeys.all, workspaceId] as const,
  list: (workspaceId: string, queryKey: string) =>
    [...submissionsQueryKeys.workspace(workspaceId), queryKey] as const
};
