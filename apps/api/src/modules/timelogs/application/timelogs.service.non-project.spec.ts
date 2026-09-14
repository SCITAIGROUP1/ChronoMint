import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import { TimelogsService } from "./timelogs.service";

function mockSubscriptions() {
  return { assertSubscriptionAllowsWrites: vi.fn().mockResolvedValue(undefined) };
}

function mockWorkspaceDataRealtime() {
  return { publishStaleToUsers: vi.fn().mockResolvedValue(undefined) };
}

function mockAuthorization() {
  return {
    evaluate: vi.fn().mockResolvedValue({ allowed: false }),
    assertAllowed: vi.fn().mockResolvedValue({ allowed: true })
  };
}

describe("TimelogsService non-project create", () => {
  it("stores full-day leave duration from workspace daily hours", async () => {
    const created = {
      id: "leave-1",
      userId: "user-1",
      taskId: null,
      classification: "LEAVE_FULL",
      tenantId: "tenant-1",
      workspaceId: "ws-1",
      activityTypeId: null,
      holidayId: null,
      startTime: new Date("2026-08-31T09:00:00.000Z"),
      endTime: new Date("2026-08-31T16:30:00.000Z"),
      durationSec: 27000,
      description: null,
      isBillable: false,
      source: "manual"
    };
    const create = vi.fn().mockResolvedValue(created);
    const prisma = {
      workspace: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValueOnce({ tenantId: "tenant-1" })
          .mockResolvedValue({ settings: { dailyTargetHours: 7.5, timezone: "UTC" } })
      },
      user: { findUniqueOrThrow: vi.fn().mockResolvedValue({ preferences: {} }) },
      timeLog: { findFirst: vi.fn().mockResolvedValue(null), create },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          timeLog: { create },
          authorization: { assertAllowed: vi.fn() }
        })
      )
    };
    const audit = {
      recordEvent: vi.fn().mockResolvedValue(undefined),
      snapshotFromLog: vi.fn().mockReturnValue({})
    };
    const service = new TimelogsService(
      prisma as never,
      { invalidateWorkspace: vi.fn() } as never,
      audit as never,
      {} as never,
      {} as never,
      mockAuthorization() as never,
      mockSubscriptions() as never,
      mockWorkspaceDataRealtime() as never
    );

    const dto = await service.create(
      "ws-1",
      "user-1",
      "MEMBER",
      {
        classification: "LEAVE_FULL",
        startTime: "2026-08-31T08:00:00.000Z"
      },
      "user-1"
    );

    expect(dto.classification).toBe("LEAVE_FULL");
    expect(dto.taskId).toBeNull();
    expect(dto.isBillable).toBe(false);
    expect(dto.durationSec).toBe(27000);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          classification: "LEAVE_FULL",
          taskId: null,
          tenantId: "tenant-1",
          durationSec: 27000,
          isBillable: false
        })
      })
    );
  });

  it("honors start and end when creating a holiday log", async () => {
    const startTime = new Date("2026-08-17T13:00:00.000Z");
    const endTime = new Date("2026-08-17T15:00:00.000Z");
    const created = {
      id: "holiday-1",
      userId: "user-1",
      taskId: null,
      classification: "PUBLIC_HOLIDAY",
      tenantId: "tenant-1",
      workspaceId: "ws-1",
      activityTypeId: null,
      holidayId: null,
      startTime,
      endTime,
      durationSec: 7200,
      description: "Company Holiday",
      isBillable: false,
      source: "manual"
    };
    const create = vi.fn().mockResolvedValue(created);
    const prisma = {
      workspace: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ tenantId: "tenant-1" })
      },
      user: { findUniqueOrThrow: vi.fn() },
      timeLog: { findFirst: vi.fn().mockResolvedValue(null), create },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          timeLog: { create },
          authorization: { assertAllowed: vi.fn() }
        })
      )
    };
    const service = new TimelogsService(
      prisma as never,
      { invalidateWorkspace: vi.fn() } as never,
      {
        recordEvent: vi.fn().mockResolvedValue(undefined),
        snapshotFromLog: vi.fn().mockReturnValue({})
      } as never,
      {} as never,
      {} as never,
      mockAuthorization() as never,
      mockSubscriptions() as never,
      mockWorkspaceDataRealtime() as never
    );

    await service.create(
      "ws-1",
      "user-1",
      "MEMBER",
      {
        classification: "PUBLIC_HOLIDAY",
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        description: "Company Holiday"
      },
      "user-1"
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          classification: "PUBLIC_HOLIDAY",
          startTime,
          endTime,
          durationSec: 7200
        })
      })
    );
    expect(prisma.user.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("rejects project create without a task", async () => {
    const service = new TimelogsService(
      {
        workspace: { findUniqueOrThrow: vi.fn().mockResolvedValue({ tenantId: "t1" }) }
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      mockAuthorization() as never,
      mockSubscriptions() as never,
      mockWorkspaceDataRealtime() as never
    );

    await expect(
      service.create("ws-1", "user-1", "MEMBER", { startTime: "2026-08-31T09:00:00.000Z" })
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof DomainException &&
        error.code === ErrorCodes.VALIDATION_ERROR &&
        error.getStatus() === HttpStatus.BAD_REQUEST
    );
  });
});

describe("TimelogsService non-project update", () => {
  const startTime = new Date("2026-08-25T13:00:00.000Z");
  const endTime = new Date("2026-08-25T21:00:00.000Z");
  const holidayLog = {
    id: "holiday-1",
    userId: "user-1",
    taskId: null,
    classification: "PUBLIC_HOLIDAY",
    tenantId: "tenant-1",
    workspaceId: "ws-1",
    activityTypeId: null,
    holidayId: "hol-1",
    startTime,
    endTime,
    durationSec: 28800,
    description: "POya",
    isBillable: false,
    source: "manual",
    task: null
  };

  function serviceForUpdate(opts: {
    log: typeof holidayLog | Record<string, unknown>;
    updated: Record<string, unknown>;
    timeLogUpdate: ReturnType<typeof vi.fn>;
    extraPrisma?: Record<string, unknown>;
  }) {
    const prisma = {
      timeLog: {
        findFirst: vi.fn().mockResolvedValueOnce(opts.log).mockResolvedValueOnce(null),
        update: opts.timeLogUpdate
      },
      workspace: { findUniqueOrThrow: vi.fn().mockResolvedValue({ tenantId: "tenant-1" }) },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
      ...opts.extraPrisma
    };
    return new TimelogsService(
      prisma as never,
      { invalidateWorkspace: vi.fn() } as never,
      {
        recordEvent: vi.fn().mockResolvedValue(undefined),
        snapshotFromLog: vi.fn().mockReturnValue({})
      } as never,
      { assertPeriodEditable: vi.fn().mockResolvedValue(undefined) } as never,
      {
        assertCanLogTask: vi.fn().mockResolvedValue(undefined),
        manageableProjectIds: vi.fn().mockResolvedValue([])
      } as never,
      mockAuthorization() as never,
      mockSubscriptions() as never,
      mockWorkspaceDataRealtime() as never
    );
  }

  it("reclassifies a public holiday to full-day leave", async () => {
    const updated = {
      ...holidayLog,
      classification: "LEAVE_FULL",
      holidayId: null
    };
    const timeLogUpdate = vi.fn().mockResolvedValue(updated);
    const service = serviceForUpdate({ log: holidayLog, updated, timeLogUpdate });

    const dto = await service.update("ws-1", "user-1", "MEMBER", "holiday-1", {
      classification: "LEAVE_FULL",
      taskId: null,
      holidayId: null,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    });

    expect(dto.classification).toBe("LEAVE_FULL");
    expect(timeLogUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          classification: "LEAVE_FULL",
          taskId: null,
          holidayId: null,
          activityTypeId: null,
          isBillable: false
        })
      })
    );
  });

  it("converts a project log to a public holiday", async () => {
    const projectLog = {
      id: "log-1",
      userId: "user-1",
      taskId: "task-1",
      classification: "PROJECT",
      tenantId: null,
      workspaceId: null,
      activityTypeId: null,
      holidayId: null,
      startTime,
      endTime,
      durationSec: 28800,
      description: "Work",
      isBillable: true,
      source: "manual",
      task: {
        projectId: "project-1",
        isActive: true,
        category: { isActive: true },
        project: { isActive: true }
      }
    };
    const updated = {
      ...projectLog,
      taskId: null,
      classification: "PUBLIC_HOLIDAY",
      tenantId: "tenant-1",
      workspaceId: "ws-1",
      isBillable: false,
      task: null
    };
    const timeLogUpdate = vi.fn().mockResolvedValue(updated);
    const service = serviceForUpdate({ log: projectLog, updated, timeLogUpdate });

    const dto = await service.update("ws-1", "user-1", "MEMBER", "log-1", {
      classification: "PUBLIC_HOLIDAY",
      taskId: null,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    });

    expect(dto.classification).toBe("PUBLIC_HOLIDAY");
    expect(dto.taskId).toBeNull();
    expect(timeLogUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          classification: "PUBLIC_HOLIDAY",
          taskId: null,
          tenantId: "tenant-1",
          workspaceId: "ws-1",
          isBillable: false
        })
      })
    );
  });
});
