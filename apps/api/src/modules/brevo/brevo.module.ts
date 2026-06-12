import { Global, Module } from "@nestjs/common";
import { BrevoDispatchService } from "./application/brevo-dispatch.service";
import { BrevoMailerService } from "./application/brevo-mailer.service";
import { BrevoNotificationService } from "./application/brevo-notification.service";
import { BrevoTimesheetReminderService } from "./application/brevo-timesheet-reminder.service";

@Global()
@Module({
  providers: [
    BrevoMailerService,
    BrevoNotificationService,
    BrevoDispatchService,
    BrevoTimesheetReminderService
  ],
  exports: [
    BrevoMailerService,
    BrevoNotificationService,
    BrevoDispatchService,
    BrevoTimesheetReminderService
  ]
})
export class BrevoModule {}
