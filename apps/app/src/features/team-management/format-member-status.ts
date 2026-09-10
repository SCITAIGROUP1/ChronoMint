import type { TeamMemberOverviewDto } from "@kloqra/contracts";

/** Display labels for the only two membership statuses. */
export function formatMemberStatus(status: TeamMemberOverviewDto["status"]): "Active" | "Inactive" {
  return status === "active" ? "Active" : "Inactive";
}
