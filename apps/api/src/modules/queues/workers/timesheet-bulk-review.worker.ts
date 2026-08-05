import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { QUEUES } from "../../../common/queues";
// eslint-disable-next-line no-restricted-imports
import { TimesheetsService } from "../../timelogs/application/timesheets.service";

export interface TimesheetBulkReviewJobPayload {
  workspaceId: string;
  reviewerUserId: string;
  /**
   * @deprecated The serialized role is no longer trusted at execution time.
   * The worker re-fetches the current membership role from the database before
   * processing each batch so that a demotion or deactivation between enqueue
   * and execution is respected. This field is kept for backward-compatible
   * deserialization only and will be removed after the migration window.
   */
  reviewerRole?: "ADMIN" | "MEMBER";
  action: "approve" | "reject";
  reviewNote?: string;
  ids: string[];
}

@Processor(QUEUES.TIMESHEET_BULK_REVIEW)
export class TimesheetBulkReviewWorker extends WorkerHost {
  constructor(
    private readonly timesheets: TimesheetsService,
    private readonly prisma: PrismaService
  ) {
    super();
  }

  async process(job: Job<TimesheetBulkReviewJobPayload, unknown, string>) {
    const { workspaceId, reviewerUserId, action, reviewNote, ids } = job.data;

    // Re-authorize at execution time. Do NOT trust the serialized reviewerRole from
    // the job payload — the user may have been demoted or deactivated since enqueue.
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: reviewerUserId
        }
      },
      select: { role: true, isActive: true }
    });

    if (!membership?.isActive) {
      return {
        successCount: 0,
        totalProcessed: ids.length,
        failures: ids.map((id) => ({
          id,
          error:
            "Reviewer is no longer an active workspace member — authorization revoked at execution time"
        }))
      };
    }

    const currentRole = membership.role as "ADMIN" | "MEMBER";

    let successCount = 0;
    const failures: { id: string; error: string }[] = [];

    for (const id of ids) {
      try {
        if (action === "approve") {
          await this.timesheets.approve(workspaceId, id, reviewerUserId, currentRole, reviewNote);
        } else {
          await this.timesheets.reject(workspaceId, id, reviewerUserId, currentRole, reviewNote);
        }
        successCount++;
      } catch (err: any) {
        failures.push({ id, error: err.message || String(err) });
      }
    }

    return { successCount, totalProcessed: ids.length, failures };
  }
}
