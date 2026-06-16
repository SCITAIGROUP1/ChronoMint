import type { ProjectDto, TimeLogDto, TimesheetPeriodDto } from "@kloqra/contracts";
import type { TimesheetApprovalStatus } from "@kloqra/ui";

export type EntryApprovalDisplay = {
  showApproval: boolean;
  status?: TimesheetApprovalStatus;
};

export function resolveEntryApprovalStatus(
  log: TimeLogDto,
  project: ProjectDto | undefined,
  submissionByKey: Map<string, TimesheetPeriodDto>
): EntryApprovalDisplay {
  if (!project?.timesheetApprovalEnabled) {
    return { showApproval: false };
  }

  const start = new Date(log.startTime);
  for (const sub of submissionByKey.values()) {
    if (sub.projectId !== project.id) continue;
    const pStart = new Date(sub.periodStart);
    const pEnd = new Date(sub.periodEnd);
    if (start >= pStart && start <= pEnd) {
      return { showApproval: true, status: sub.status };
    }
  }

  return { showApproval: true, status: "DRAFT" };
}

export function isTimeEntryLocked(
  log: TimeLogDto,
  project: ProjectDto | undefined,
  submissionByKey: Map<string, TimesheetPeriodDto>
): boolean {
  const approval = resolveEntryApprovalStatus(log, project, submissionByKey);
  return approval.status === "SUBMITTED" || approval.status === "APPROVED";
}
