/** Builds list query filters for My projects status select (mirrors admin projects). */
export function memberProjectsStatusFilters(
  statusFilter: "ALL" | "active" | "inactive"
): { isActive: string } | undefined {
  if (statusFilter === "active") return { isActive: "true" };
  if (statusFilter === "inactive") return { isActive: "false" };
  return undefined;
}
