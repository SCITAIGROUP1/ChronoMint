export const catalogQueryKeys = {
  all: ["catalog"] as const,
  workspace: (workspaceId: string) => [...catalogQueryKeys.all, workspaceId] as const,
  projects: (workspaceId: string) =>
    [...catalogQueryKeys.workspace(workspaceId), "projects"] as const,
  tasks: (workspaceId: string, filterKey = "") =>
    [...catalogQueryKeys.workspace(workspaceId), "tasks", filterKey] as const,
  categories: (workspaceId: string) =>
    [...catalogQueryKeys.workspace(workspaceId), "categories"] as const
};
