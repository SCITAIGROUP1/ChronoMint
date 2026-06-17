import { ErrorCodes, type ListProjectsResponse } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import { ProjectsService } from "./projects.service";

describe("ProjectsService", () => {
  let service: ProjectsService;
  let mockPrisma: any;
  let mockAccess: any;

  const workspaceId = "ws-1";
  const userId = "user-1";

  beforeEach(() => {
    mockPrisma = {
      project: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn()
      },
      task: {
        findMany: vi.fn().mockResolvedValue([])
      },
      timeLog: {
        groupBy: vi.fn().mockResolvedValue([])
      },
      userProjectColor: {
        findMany: vi.fn().mockResolvedValue([])
      }
    };
    mockAccess = {
      accessibleProjectIds: vi.fn(),
      assertCanAccessProject: vi.fn()
    };
    service = new ProjectsService(mockPrisma, mockAccess, {
      notify: vi.fn().mockResolvedValue(undefined),
      notifyWorkspaceAdmins: vi.fn().mockResolvedValue(undefined)
    } as never);
  });

  it("list returns empty paginated result when user has no accessible projects", async () => {
    mockAccess.accessibleProjectIds.mockResolvedValue([]);

    const result = await service.list(workspaceId, userId, "MEMBER", { page: 1, limit: 20 });
    expect(result).toEqual({ items: [], page: 1, limit: 20, total: 0, totalPages: 0 });
    expect(mockPrisma.project.findMany).not.toHaveBeenCalled();
  });

  it("list scopes projects to accessible ids in workspace", async () => {
    mockAccess.accessibleProjectIds.mockResolvedValue(["p1", "p2"]);
    mockPrisma.project.count.mockResolvedValue(1);
    mockPrisma.project.findMany.mockResolvedValue([
      {
        id: "p1",
        workspaceId,
        name: "Alpha",
        color: "#236bfe",
        clientName: null,
        budgetHours: null,
        isActive: true,
        timesheetApprovalEnabled: false,
        timesheetApprovalPeriod: null,
        workspace: { name: "Kloqra" }
      }
    ]);

    const result: ListProjectsResponse = await service.list(workspaceId, userId, "MEMBER", {
      page: 1,
      limit: 20
    });

    expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ["p1", "p2"] },
          workspaceId
        }),
        skip: 0,
        take: 20
      })
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.name).toBe("Alpha");
    expect(result.items[0]).toHaveProperty("totalTrackedSec", 0);
    expect(result.items[0]).toHaveProperty("timesheetApprovalEnabled", false);
    expect(result.items[0]).not.toHaveProperty("budgetHours");
  });

  it("list includes aggregated total tracked seconds per project", async () => {
    mockAccess.accessibleProjectIds.mockResolvedValue(["p1"]);
    mockPrisma.project.count.mockResolvedValue(1);
    mockPrisma.project.findMany.mockResolvedValue([
      {
        id: "p1",
        workspaceId,
        name: "Alpha",
        color: "#236bfe",
        clientName: "Acme",
        budgetHours: null,
        isActive: true,
        timesheetApprovalEnabled: false,
        timesheetApprovalPeriod: null,
        workspace: { name: "Kloqra" }
      }
    ]);
    mockPrisma.task.findMany.mockResolvedValue([
      { id: "t1", projectId: "p1" },
      { id: "t2", projectId: "p1" }
    ]);
    mockPrisma.timeLog.groupBy.mockResolvedValue([
      { taskId: "t1", _sum: { durationSec: 3600 } },
      { taskId: "t2", _sum: { durationSec: 1800 } }
    ]);

    const result: ListProjectsResponse = await service.list(workspaceId, userId, "ADMIN", {
      page: 1,
      limit: 20
    });

    expect(result.items[0]).toMatchObject({
      name: "Alpha",
      totalTrackedSec: 5400
    });
  });

  it("create persists a project with default color", async () => {
    mockPrisma.project.findFirst.mockResolvedValue(null);
    mockPrisma.project.create.mockResolvedValue({
      id: "p-new",
      workspaceId,
      name: "New Project",
      color: "#236bfe",
      clientName: "Client",
      budgetHours: null,
      isActive: true,
      timesheetApprovalEnabled: false,
      timesheetApprovalPeriod: null,
      workspace: { name: "Kloqra" }
    });

    const result = await service.create(workspaceId, {
      name: "New Project",
      clientName: "Client",
      isActive: true
    });

    expect(mockPrisma.project.create).toHaveBeenCalled();
    expect(result.name).toBe("New Project");
    expect(result.workspaceId).toBe(workspaceId);
  });

  it("create rejects duplicate names within the same workspace", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({ id: "p-existing", name: "Alpha" });

    await expect(
      service.create(workspaceId, { name: "Alpha", clientName: "Client", isActive: true })
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.VALIDATION_ERROR &&
        err.getStatus() === HttpStatus.CONFLICT
    );
    expect(mockPrisma.project.create).not.toHaveBeenCalled();
  });

  it("get throws NOT_FOUND when project is missing", async () => {
    mockAccess.assertCanAccessProject.mockResolvedValue(undefined);
    mockPrisma.project.findFirst.mockResolvedValue(null);

    await expect(service.get(workspaceId, userId, "ADMIN", "missing")).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.NOT_FOUND &&
        err.getStatus() === HttpStatus.NOT_FOUND
    );
  });
});
