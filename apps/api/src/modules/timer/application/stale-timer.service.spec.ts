import { HARD_AUTO_STOP_HOURS, IDLE_TIMER_ALERT_HOURS } from "@kloqra/contracts";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { StaleTimerService } from "./stale-timer.service";

function createRedisMock(keys: string[], values: Record<string, string>) {
  const client = {
    keys: vi.fn().mockResolvedValue(keys),
    get: vi.fn((key: string) => Promise.resolve(values[key] ?? null)),
    del: vi.fn().mockResolvedValue(1),
    setex: vi.fn().mockResolvedValue("OK"),
    publish: vi.fn().mockResolvedValue(1)
  };
  return { client, redis: { getClient: () => client } };
}

describe("StaleTimerService", () => {
  let service: StaleTimerService;
  let redisMock: ReturnType<typeof createRedisMock>;
  let mockPrisma: any;
  let mockAudit: any;
  let mockBrevoDispatch: any;

  const workspaceId = "ws-1";
  const userId = "user-1";
  const taskId = "task-1";
  const redisKey = `timer:${workspaceId}:${userId}`;

  beforeEach(() => {
    mockPrisma = {
      task: {
        findUnique: vi.fn().mockResolvedValue({
          id: taskId,
          taskName: "Design",
          billableDefault: true
        })
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          timeLog: {
            create: vi.fn().mockResolvedValue({
              id: "log-1",
              userId,
              taskId,
              startTime: new Date(),
              endTime: new Date(),
              durationSec: HARD_AUTO_STOP_HOURS * 3600,
              description: null,
              isBillable: true,
              source: "timer_autostopped"
            })
          }
        };
        return fn(tx);
      })
    };
    mockAudit = {
      snapshotFromLog: vi.fn().mockReturnValue({ taskId }),
      recordEvent: vi.fn().mockResolvedValue(undefined)
    };
    mockBrevoDispatch = {
      maybeSendIdleTimerAlert: vi.fn().mockResolvedValue(undefined)
    };
  });

  it("auto-stops timers exceeding HARD_AUTO_STOP_HOURS", async () => {
    const startedAt = new Date(
      Date.now() - (HARD_AUTO_STOP_HOURS * 3600 + 60) * 1000
    ).toISOString();
    const state = JSON.stringify({
      userId,
      workspaceId,
      taskId,
      startedAt,
      accumulatedSec: 0,
      isPaused: false,
      pausedAt: null
    });

    redisMock = createRedisMock([redisKey], { [redisKey]: state });
    service = new StaleTimerService(
      mockPrisma,
      redisMock.redis as never,
      mockAudit,
      mockBrevoDispatch
    );

    await service.scanAndAutoStop();

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(redisMock.client.del).toHaveBeenCalledWith(redisKey);
    expect(redisMock.client.setex).toHaveBeenCalledWith(
      `timer_autostopped:${workspaceId}:${userId}`,
      7200,
      expect.any(String)
    );
  });

  it("sends idle alert at IDLE_TIMER_ALERT_HOURS", async () => {
    const startedAt = new Date(
      Date.now() - (IDLE_TIMER_ALERT_HOURS * 3600 + 60) * 1000
    ).toISOString();
    const state = JSON.stringify({
      userId,
      workspaceId,
      taskId,
      startedAt,
      accumulatedSec: 0,
      isPaused: false,
      pausedAt: null
    });

    redisMock = createRedisMock([redisKey], { [redisKey]: state });
    service = new StaleTimerService(
      mockPrisma,
      redisMock.redis as never,
      mockAudit,
      mockBrevoDispatch
    );

    await service.scanAndAutoStop();

    expect(mockBrevoDispatch.maybeSendIdleTimerAlert).toHaveBeenCalledWith(userId, {
      taskName: "Design",
      durationHours: IDLE_TIMER_ALERT_HOURS
    });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("skips timers below the hard ceiling", async () => {
    const startedAt = new Date(Date.now() - 3600 * 1000).toISOString();
    const state = JSON.stringify({
      userId,
      workspaceId,
      taskId,
      startedAt,
      accumulatedSec: 0,
      isPaused: false,
      pausedAt: null
    });

    redisMock = createRedisMock([redisKey], { [redisKey]: state });
    service = new StaleTimerService(
      mockPrisma,
      redisMock.redis as never,
      mockAudit,
      mockBrevoDispatch
    );

    await service.scanAndAutoStop();

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockBrevoDispatch.maybeSendIdleTimerAlert).not.toHaveBeenCalled();
    expect(redisMock.client.del).not.toHaveBeenCalled();
  });
});
