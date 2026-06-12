import { HARD_AUTO_STOP_HOURS, IDLE_TIMER_ALERT_HOURS } from "@kloqra/contracts";
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { RedisService } from "../../../common/redis/redis.service";
import { BrevoDispatchService } from "../../brevo/application/brevo-dispatch.service";
// eslint-disable-next-line no-restricted-imports
import { TimelogAuditService } from "../../timelogs/application/timelog-audit.service";

const TICK_MS = 60_000; // Check every 60 seconds

interface TimerState {
  userId: string;
  workspaceId: string;
  taskId: string;
  startedAt: string;
  accumulatedSec: number;
  isPaused: boolean;
  pausedAt: string | null;
}

@Injectable()
export class StaleTimerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StaleTimerService.name);
  private ticker: ReturnType<typeof setInterval> | null = null;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private audit: TimelogAuditService,
    private brevoDispatch: BrevoDispatchService
  ) {}

  onModuleInit() {
    this.ticker = setInterval(() => {
      void this.scanAndAutoStop().catch((err: unknown) => {
        this.logger.error(
          `Stale timer scan failed: ${err instanceof Error ? err.message : String(err)}`
        );
      });
    }, TICK_MS);
  }

  onModuleDestroy() {
    if (this.ticker) clearInterval(this.ticker);
  }

  async scanAndAutoStop() {
    const keys = await this.redis.getClient().keys("timer:*:*");
    const hardCeilingSec = HARD_AUTO_STOP_HOURS * 3600;
    const idleAlertSec = IDLE_TIMER_ALERT_HOURS * 3600;

    for (const key of keys) {
      const raw = await this.redis.getClient().get(key);
      if (!raw) continue;

      let state: TimerState;
      try {
        state = JSON.parse(raw) as TimerState;
      } catch {
        continue;
      }

      if (!state.startedAt || !state.userId || !state.workspaceId || !state.taskId) continue;

      const totalElapsedSec = this.computeElapsedSec(state);

      if (totalElapsedSec >= hardCeilingSec) {
        await this.autoStop(state, key, hardCeilingSec);
        continue;
      }

      if (totalElapsedSec >= idleAlertSec) {
        await this.maybeSendIdleAlert(state, key, totalElapsedSec);
      }
    }
  }

  private computeElapsedSec(state: TimerState): number {
    const accumulated = state.accumulatedSec ?? 0;
    if (state.isPaused) return accumulated;

    const startedMs = new Date(state.startedAt).getTime();
    const currentSec = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
    return accumulated + currentSec;
  }

  private async maybeSendIdleAlert(state: TimerState, redisKey: string, totalElapsedSec: number) {
    const alertKey = `timer_idle_alerted:${state.workspaceId}:${state.userId}:${redisKey}`;
    const alreadySent = await this.redis.getClient().get(alertKey);
    if (alreadySent) return;

    const task = await this.prisma.task.findUnique({
      where: { id: state.taskId },
      select: { taskName: true }
    });
    if (!task) return;

    await this.brevoDispatch.maybeSendIdleTimerAlert(state.userId, {
      taskName: task.taskName,
      durationHours: IDLE_TIMER_ALERT_HOURS
    });

    const ttlSec = Math.max(60, HARD_AUTO_STOP_HOURS * 3600 - totalElapsedSec);
    await this.redis.getClient().setex(alertKey, ttlSec, "1");
  }

  private async autoStop(state: TimerState, redisKey: string, capSec: number) {
    try {
      const task = await this.prisma.task.findUnique({ where: { id: state.taskId } });
      if (!task) {
        await this.redis.getClient().del(redisKey);
        return;
      }

      const end = new Date();
      const start = new Date(end.getTime() - capSec * 1000);

      await this.prisma.$transaction(async (tx) => {
        const log = await tx.timeLog.create({
          data: {
            userId: state.userId,
            taskId: state.taskId,
            startTime: start,
            endTime: end,
            durationSec: capSec,
            description: null,
            isBillable: task.billableDefault,
            source: "timer_autostopped"
          }
        });
        await this.audit.recordEvent(tx, {
          workspaceId: state.workspaceId,
          timeLogId: log.id,
          entryUserId: state.userId,
          actorId: state.userId,
          action: "CREATE",
          before: null,
          after: this.audit.snapshotFromLog(log)
        });
      });

      await this.redis
        .getClient()
        .setex(
          `timer_autostopped:${state.workspaceId}:${state.userId}`,
          7200,
          JSON.stringify({ stoppedAt: end.toISOString(), durationSec: capSec })
        );

      await this.redis.getClient().del(redisKey);
      await this.redis
        .getClient()
        .publish(
          `presence:${state.workspaceId}`,
          JSON.stringify({ type: "stop", userId: state.userId })
        );

      this.logger.warn(
        `Auto-stopped stale timer for user ${state.userId} in workspace ${state.workspaceId} after ${capSec}s`
      );
    } catch (err) {
      this.logger.error(
        `Failed to auto-stop timer ${redisKey}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
