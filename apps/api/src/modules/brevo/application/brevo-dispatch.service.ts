import {
  resolveEffectiveNotifications,
  type ResolvedUserNotifications,
  type UserPreferences
} from "@kloqra/contracts";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { BrevoNotificationService } from "./brevo-notification.service";

type NotificationType = keyof Omit<ResolvedUserNotifications, "enabled">;

@Injectable()
export class BrevoDispatchService {
  private readonly logger = new Logger(BrevoDispatchService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: BrevoNotificationService
  ) {}

  private async shouldSendEmail(
    userId: string,
    type: NotificationType
  ): Promise<{
    email: string;
  } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, preferences: true }
    });
    if (!user?.email) return null;

    const prefs = resolveEffectiveNotifications((user.preferences ?? {}) as UserPreferences);
    if (!prefs.enabled || !prefs[type]) return null;

    return { email: user.email };
  }

  async maybeSendProjectAssignment(
    userId: string,
    params: { projectName: string; workspaceName: string }
  ): Promise<void> {
    const recipient = await this.shouldSendEmail(userId, "projectAssignment");
    if (!recipient) return;

    try {
      await this.notifications.sendProjectAssignment({
        to: recipient.email,
        projectName: params.projectName,
        workspaceName: params.workspaceName
      });
    } catch (err) {
      this.logger.error(
        `Failed to send project assignment email to ${recipient.email}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  async maybeSendTimesheetReminder(
    userId: string,
    params: { projectName: string; periodStart: string; periodEnd: string }
  ): Promise<void> {
    const recipient = await this.shouldSendEmail(userId, "timesheetReminders");
    if (!recipient) return;

    try {
      await this.notifications.sendTimesheetReminder({
        to: recipient.email,
        ...params
      });
    } catch (err) {
      this.logger.error(
        `Failed to send timesheet reminder to ${recipient.email}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  async maybeSendIdleTimerAlert(
    userId: string,
    params: { taskName: string; durationHours: number }
  ): Promise<void> {
    const recipient = await this.shouldSendEmail(userId, "idleTimerAlert");
    if (!recipient) return;

    try {
      await this.notifications.sendIdleTimerAlert({
        to: recipient.email,
        ...params
      });
    } catch (err) {
      this.logger.error(
        `Failed to send idle timer alert to ${recipient.email}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
