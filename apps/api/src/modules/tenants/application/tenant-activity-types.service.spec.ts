import { describe, expect, it, vi, beforeEach } from "vitest";
import { TenantActivityTypesService } from "./tenant-activity-types.service";

describe("TenantActivityTypesService", () => {
  let service: TenantActivityTypesService;
  let prisma: {
    tenantActivityType: {
      upsert: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    timeLog: { count: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    prisma = {
      tenantActivityType: {
        upsert: vi.fn().mockResolvedValue({}),
        findMany: vi.fn(),
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      },
      timeLog: { count: vi.fn() }
    };
    service = new TenantActivityTypesService(prisma as never);
  });

  it("lists activity types after ensuring system rows", async () => {
    prisma.tenantActivityType.findMany.mockResolvedValue([
      {
        id: "a1",
        tenantId: "t1",
        name: "Office Event",
        slug: "office_event",
        color: "#0d9488",
        isSystem: true,
        isActive: true
      }
    ]);
    const res = await service.list("t1", {});
    expect(prisma.tenantActivityType.upsert).toHaveBeenCalled();
    expect(res.items[0]?.name).toBe("Office Event");
  });

  it("refuses to delete system types", async () => {
    prisma.tenantActivityType.findFirst.mockResolvedValue({
      id: "a1",
      tenantId: "t1",
      name: "Office Event",
      isSystem: true
    });
    await expect(service.remove("t1", "a1")).rejects.toMatchObject({
      message: expect.stringContaining("System activity types")
    });
  });
});
