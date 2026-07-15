import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { QUEUES } from "../../common/queues";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { TimelogsModule } from "../timelogs/timelogs.module";
import { BulkCategoryWorker } from "./workers/bulk-category.worker";
import { BulkInviteWorker } from "./workers/bulk-invite.worker";
import { MailWorker } from "./workers/mail.worker";
import { TimesheetBulkReviewWorker } from "./workers/timesheet-bulk-review.worker";

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUES.MAIL,
      defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
    }),
    BullModule.registerQueue({
      name: QUEUES.BULK_INVITE
    }),
    BullModule.registerQueue({
      name: QUEUES.BULK_CATEGORY
    }),
    BullModule.registerQueue({
      name: QUEUES.HELPDESK_INGEST,
      defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
    }),
    BullModule.registerQueue({
      name: QUEUES.HELPDESK_REPLY,
      defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
    }),
    BullModule.registerQueue({
      name: QUEUES.HELPDESK_SLA,
      defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
    }),
    BullModule.registerQueue({
      name: QUEUES.HELPDESK_NOTIFY,
      defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
    }),
    BullModule.registerQueue({
      name: QUEUES.TIMESHEET_BULK_REVIEW,
      defaultJobOptions: { attempts: 1 }
    }),
    AuthModule,
    NotificationsModule,
    SubscriptionsModule,
    TimelogsModule
  ],
  providers: [MailWorker, BulkInviteWorker, BulkCategoryWorker, TimesheetBulkReviewWorker],
  exports: [BullModule]
})
export class QueuesModule {}
