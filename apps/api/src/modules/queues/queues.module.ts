import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { QUEUES } from "../../common/queues";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { BulkInviteWorker } from "./workers/bulk-invite.worker";
import { MailWorker } from "./workers/mail.worker";

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUES.MAIL,
      defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
    }),
    BullModule.registerQueue({
      name: QUEUES.BULK_INVITE
    }),
    AuthModule,
    NotificationsModule
  ],
  providers: [MailWorker, BulkInviteWorker],
  exports: [BullModule]
})
export class QueuesModule {}
