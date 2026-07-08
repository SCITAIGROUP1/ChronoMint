export const paginatedListQueryKeys = {
  all: ["paginated-list"] as const,
  list: (
    workspaceId: string,
    basePath: string,
    page: number,
    limit: number,
    search: string,
    filterKey: string,
    sessionGeneration: number
  ) =>
    [
      ...paginatedListQueryKeys.all,
      workspaceId,
      basePath,
      page,
      limit,
      search,
      filterKey,
      sessionGeneration
    ] as const
};
