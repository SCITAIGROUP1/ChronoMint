import { ErrorCodes } from "@kloqra/contracts";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import { TenantHolidaysService } from "./tenant-holidays.service";

describe("TenantHolidaysService", () => {
  let service: TenantHolidaysService;
  let prisma: {
    tenantHoliday: {
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    tenantMember: { findMany: ReturnType<typeof vi.fn> };
    timeLog: { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    prisma = {
      tenantHoliday: {
        findMany: vi.fn(),
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      },
      tenantMember: { findMany: vi.fn() },
      timeLog: { findFirst: vi.fn(), create: vi.fn() }
    };
    service = new TenantHolidaysService(prisma as never);
  });

  it("lists holidays for a tenant", async () => {
    prisma.tenantHoliday.findMany.mockResolvedValue([
      {
        id: "h1",
        tenantId: "t1",
        date: new Date("2026-12-25T00:00:00.000Z"),
        name: "Christmas",
        isActive: true
      }
    ]);
    const res = await service.list("t1", {});
    expect(res.items).toEqual([
      { id: "h1", tenantId: "t1", date: "2026-12-25", name: "Christmas", isActive: true }
    ]);
  });

  it("applies a holiday to members and skips overlaps", async () => {
    prisma.tenantHoliday.findFirst.mockResolvedValue({
      id: "h1",
      tenantId: "t1",
      date: new Date("2026-12-25T00:00:00.000Z"),
      name: "Christmas",
      isActive: true
    });
    prisma.tenantMember.findMany.mockResolvedValue([
      {
        userId: "u1",
        user: {
          id: "u1",
          preferences: {},
          memberships: [{ workspace: { id: "ws1", settings: { dailyTargetHours: 8 } } }]
        }
      },
      {
        userId: "u2",
        user: {
          id: "u2",
          preferences: {},
          memberships: [{ workspace: { id: "ws1", settings: { dailyTargetHours: 8 } } }]
        }
      }
    ]);
    prisma.timeLog.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "existing" });
    prisma.timeLog.create.mockResolvedValue({});

    const res = await service.applyToMembers("t1", "h1");
    expect(res.createdCount).toBe(1);
    expect(res.skippedCount).toBe(1);
    expect(res.skipped[0]?.reason).toBe("overlap");
    expect(prisma.timeLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          classification: "PUBLIC_HOLIDAY",
          isBillable: false,
          durationSec: 8 * 3600,
          taskId: null
        })
      })
    );
  });

  it("rejects apply on missing holiday", async () => {
    prisma.tenantHoliday.findFirst.mockResolvedValue(null);
    await expect(service.applyToMembers("t1", "missing")).rejects.toMatchObject({
      code: ErrorCodes.NOT_FOUND
    });
    expect(DomainException).toBeDefined();
  });
});
