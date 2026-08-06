import { describe, expect, it, vi, beforeEach } from "vitest";
import { FavoritesService } from "./favorites.service";

type AnyMock = ReturnType<typeof vi.fn>;

function makePrisma() {
  return {
    userFavoriteProject: {
      findMany: vi.fn() as AnyMock,
      findUnique: vi.fn() as AnyMock,
      findFirst: vi.fn() as AnyMock,
      count: vi.fn() as AnyMock,
      create: vi.fn() as AnyMock,
      delete: vi.fn() as AnyMock,
      deleteMany: vi.fn() as AnyMock
    },
    userFavoriteTask: {
      findMany: vi.fn() as AnyMock,
      findUnique: vi.fn() as AnyMock,
      findFirst: vi.fn() as AnyMock,
      count: vi.fn() as AnyMock,
      create: vi.fn() as AnyMock,
      delete: vi.fn() as AnyMock,
      deleteMany: vi.fn() as AnyMock
    }
  };
}

describe("FavoritesService", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let access: {
    assertCanAccessProject: AnyMock;
    assertCanLogTask: AnyMock;
  };
  let service: FavoritesService;

  beforeEach(() => {
    prisma = makePrisma();
    access = {
      assertCanAccessProject: vi.fn().mockResolvedValue(undefined),
      assertCanLogTask: vi.fn().mockResolvedValue(undefined)
    };
    service = new FavoritesService(prisma as any, access as any);
  });

  it("lists favorites ordered by createdAt with task metadata", async () => {
    prisma.userFavoriteProject.findMany.mockResolvedValue([{ projectId: "p1" }]);
    prisma.userFavoriteTask.findMany.mockResolvedValue([
      {
        taskId: "t1",
        task: {
          projectId: "p1",
          taskName: "Design",
          project: { name: "Alpha", color: "#111111" }
        }
      }
    ]);

    const result = await service.list("u1", "w1");
    expect(result).toEqual({
      projects: ["p1"],
      tasks: [
        {
          projectId: "p1",
          taskId: "t1",
          projectName: "Alpha",
          taskName: "Design",
          projectColor: "#111111"
        }
      ]
    });
    expect(prisma.userFavoriteProject.findMany).toHaveBeenCalledWith({
      where: { userId: "u1", workspaceId: "w1" },
      orderBy: { createdAt: "asc" },
      select: { projectId: true }
    });
  });

  it("adds a project and drops the oldest when at cap", async () => {
    prisma.userFavoriteProject.findUnique.mockResolvedValue(null);
    prisma.userFavoriteProject.count.mockResolvedValue(5);
    prisma.userFavoriteProject.findFirst.mockResolvedValue({ id: "old-1" });
    prisma.userFavoriteProject.create.mockResolvedValue({});
    prisma.userFavoriteProject.findMany.mockResolvedValue([{ projectId: "p-new" }]);
    prisma.userFavoriteTask.findMany.mockResolvedValue([]);

    await service.addProject("u1", "w1", "MEMBER", "p-new");

    expect(access.assertCanAccessProject).toHaveBeenCalledWith("w1", "u1", "MEMBER", "p-new");
    expect(prisma.userFavoriteProject.delete).toHaveBeenCalledWith({ where: { id: "old-1" } });
    expect(prisma.userFavoriteProject.create).toHaveBeenCalledWith({
      data: { userId: "u1", workspaceId: "w1", projectId: "p-new" }
    });
  });

  it("does not create a duplicate project favorite", async () => {
    prisma.userFavoriteProject.findUnique.mockResolvedValue({ id: "existing" });
    prisma.userFavoriteProject.findMany.mockResolvedValue([{ projectId: "p1" }]);
    prisma.userFavoriteTask.findMany.mockResolvedValue([]);

    await service.addProject("u1", "w1", "MEMBER", "p1");
    expect(prisma.userFavoriteProject.create).not.toHaveBeenCalled();
  });

  it("adds a task after access check", async () => {
    prisma.userFavoriteTask.findUnique.mockResolvedValue(null);
    prisma.userFavoriteTask.count.mockResolvedValue(0);
    prisma.userFavoriteTask.create.mockResolvedValue({});
    prisma.userFavoriteProject.findMany.mockResolvedValue([]);
    prisma.userFavoriteTask.findMany.mockResolvedValue([]);

    await service.addTask("u1", "w1", "MEMBER", "t1");
    expect(access.assertCanLogTask).toHaveBeenCalledWith("w1", "u1", "MEMBER", "t1");
    expect(prisma.userFavoriteTask.create).toHaveBeenCalledWith({
      data: { userId: "u1", workspaceId: "w1", taskId: "t1" }
    });
  });

  it("removes a project favorite", async () => {
    prisma.userFavoriteProject.deleteMany.mockResolvedValue({ count: 1 });
    prisma.userFavoriteProject.findMany.mockResolvedValue([]);
    prisma.userFavoriteTask.findMany.mockResolvedValue([]);

    await service.removeProject("u1", "w1", "p1");
    expect(prisma.userFavoriteProject.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", workspaceId: "w1", projectId: "p1" }
    });
  });
});
