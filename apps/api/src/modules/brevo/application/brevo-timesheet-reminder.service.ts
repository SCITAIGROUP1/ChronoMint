import { resolveEffectiveNotifications, type UserPreferences } from "@kloqra/contracts";
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { RedisService } from "../../../common/redis/redis.service";
import {
  getPeriodRange,
  parseWorkspaceSettingsFromRaw,
  resolveApprovalPeriod
} from "../../../common/time/approval-period.util";
import { BrevoDispatchService } from "./brevo-dispatch.service";

const TICK_MS = 24 * 60 * 60 * 1000; // Daily
const DEDUP_TTL_SEC = 24 * 60 * 60;

@Injectable()
export class BrevoTimesheetReminderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BrevoTimesheetReminderService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private dispatch: BrevoDispatchService
  ) {}

  onModuleInit() {
    if (!process.env.DATABASE_URL?.trim()) {
      this.logger.warn("DATABASE_URL not set — timesheet reminder worker disabled.");
      return;
    }
    this.timer = setInterval(() => {
      void this.runReminders().catch((err: unknown) => {
        this.logger.error(
          `Timesheet reminder tick failed: ${err instanceof Error ? err.message : String(err)}`
        );
      });
    }, TICK_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async runReminders() {
    const today = new Date().toISOString();
    const memberships = await this.prisma.teamMember.findMany({
      where: {
        isActive: true,
        team: {
          project: {
            timesheetApprovalEnabled: true,
            isActive: true
          }
        }
      },
      include: {
        user: { select: { id: true, email: true, preferences: true } },
        team: {
          include: {
            project: {
              include: { workspace: { select: { id: true, settings: true } } }
            }
          }
        }
      }
    });

    for (const membership of memberships) {
      const prefs = resolveEffectiveNotifications(
        (membership.user.preferences ?? {}) as UserPreferences
      );
      if (!prefs.enabled || !prefs.timesheetReminders) continue;

      const project = membership.team.project;
      const workspaceSettings = parseWorkspaceSettingsFromRaw(project.workspace.settings);
      const approvalPeriod = resolveApprovalPeriod(
        project.timesheetApprovalPeriod,
        workspaceSettings
      );
      const { periodStart, periodEnd } = getPeriodRange(today, approvalPeriod, workspaceSettings);

      const period = await this.prisma.timesheetPeriod.findUnique({
        where: {
          userId_projectId_periodStart: {
            userId: membership.userId,
            projectId: project.id,
            periodStart
          }
        }
      });

      const status = period?.status ?? "DRAFT";
      if (status !== "DRAFT") continue;

      const dedupKey = `timesheet_reminder:${membership.userId}:${project.id}:${periodStart.toISOString()}`;
      const alreadySent = await this.redis.getClient().get(dedupKey);
      if (alreadySent) continue;

      await this.dispatch.maybeSendTimesheetReminder(membership.userId, {
        projectName: project.name,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString()
      });

      await this.redis.getClient().setex(dedupKey, DEDUP_TTL_SEC, "1");
    }
  }
}
