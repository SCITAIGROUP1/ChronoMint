import { buildAdminApprovalsHref } from "@kloqra/web-shared";

/** Banner is shown only after the pending query settles with a positive count. */
export function shouldShowProjectPendingApprovalsBanner(
  loading: boolean,
  pendingCount: number
): boolean {
  return !loading && pendingCount > 0;
}

export function formatProjectPendingApprovalsTitle(pendingCount: number): string {
  return pendingCount === 1
    ? "1 timesheet waiting for approval"
    : `${pendingCount} timesheets waiting for approval`;
}

export function buildProjectTeamApprovalsHref(projectId: string): string {
  return buildAdminApprovalsHref({ tab: "review", projectId });
}
