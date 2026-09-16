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
      count: ReturnType<typeof vi.fn>;
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
        delete: vi.fn(),
        count: vi.fn()
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
        parentId: null,
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
    expect(res.items[0]?.parentId).toBeNull();
  });

  it("creates a sub-activity under a parent catalog type", async () => {
    prisma.tenantActivityType.findFirst.mockResolvedValue({
      id: "training-1",
      tenantId: "t1",
      parentId: null,
      name: "Training",
      isSystem: false
    });
    prisma.tenantActivityType.create.mockResolvedValue({
      id: "workshop-1",
      tenantId: "t1",
      parentId: "training-1",
      name: "Workshop",
      slug: null,
      color: "#7c3aed",
      isSystem: false,
      isActive: true
    });

    const res = await service.create("t1", { name: "Workshop", parentId: "training-1" });
    expect(res.parentId).toBe("training-1");
    expect(prisma.tenantActivityType.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ parentId: "training-1", name: "Workshop" })
      })
    );
  });

  it("refuses a third nesting level", async () => {
    prisma.tenantActivityType.findFirst.mockResolvedValue({
      id: "workshop-1",
      tenantId: "t1",
      parentId: "training-1",
      name: "Workshop"
    });
    await expect(
      service.create("t1", { name: "Intro", parentId: "workshop-1" })
    ).rejects.toMatchObject({
      message: expect.stringContaining("Sub-activities cannot have their own")
    });
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

  it("refuses to delete a type that still has sub-activities", async () => {
    prisma.tenantActivityType.findFirst.mockResolvedValue({
      id: "training-1",
      tenantId: "t1",
      name: "Training",
      isSystem: false
    });
    prisma.tenantActivityType.count.mockResolvedValue(1);
    await expect(service.remove("t1", "training-1")).rejects.toMatchObject({
      message: expect.stringContaining("Remove sub-activities first")
    });
  });

  it("updates a custom activity type name and color", async () => {
    prisma.tenantActivityType.findFirst.mockResolvedValue({
      id: "workshop-1",
      tenantId: "t1",
      parentId: "training-1",
      name: "Workshop",
      isSystem: false
    });
    prisma.tenantActivityType.update.mockResolvedValue({
      id: "workshop-1",
      tenantId: "t1",
      parentId: "training-1",
      name: "Get Together",
      slug: null,
      color: "#dc2626",
      isSystem: false,
      isActive: true
    });

    const res = await service.update("t1", "workshop-1", {
      name: "Get Together",
      color: "#dc2626"
    });

    expect(res.name).toBe("Get Together");
    expect(res.color).toBe("#dc2626");
    expect(prisma.tenantActivityType.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Get Together", color: "#dc2626" })
      })
    );
  });
});
