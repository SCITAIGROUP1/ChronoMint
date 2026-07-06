import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { QUEUES } from "../../../common/queues";
// eslint-disable-next-line no-restricted-imports
import { TimesheetsService } from "../../timelogs/application/timesheets.service";

export interface TimesheetBulkReviewJobPayload {
  workspaceId: string;
  reviewerUserId: string;
  reviewerRole: "ADMIN" | "MEMBER";
  action: "approve" | "reject";
  reviewNote?: string;
  ids: string[];
}

@Processor(QUEUES.TIMESHEET_BULK_REVIEW)
export class TimesheetBulkReviewWorker extends WorkerHost {
  constructor(private readonly timesheets: TimesheetsService) {
    super();
  }

  async process(job: Job<TimesheetBulkReviewJobPayload, unknown, string>) {
    const { workspaceId, reviewerUserId, reviewerRole, action, reviewNote, ids } = job.data;

    let successCount = 0;
    const failures: { id: string; error: string }[] = [];

    for (const id of ids) {
      try {
        if (action === "approve") {
          await this.timesheets.approve(workspaceId, id, reviewerUserId, reviewerRole, reviewNote);
        } else {
          await this.timesheets.reject(workspaceId, id, reviewerUserId, reviewerRole, reviewNote);
        }
        successCount++;
      } catch (err: any) {
        failures.push({ id, error: err.message || String(err) });
      }
    }

    return { successCount, totalProcessed: ids.length, failures };
  }
}
