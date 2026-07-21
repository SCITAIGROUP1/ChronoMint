import { ErrorCodes, type ListProjectsResponse } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import { ProjectsService } from "./projects.service";

describe("ProjectsService", () => {
  let service: ProjectsService;
  let mockPrisma: any;
  let mockAccess: any;
  let mockDispatch: {
    notify: ReturnType<typeof vi.fn>;
    notifyWorkspaceAdmins: ReturnType<typeof vi.fn>;
  };
  let mockBulkQueue: { add: ReturnType<typeof vi.fn>; getJob: ReturnType<typeof vi.fn> };
  let mockPlanLimit: { assertSeatsForEmails: ReturnType<typeof vi.fn> };
  let mockRoleGrantPolicy: { assertProjectManagerGrant: ReturnType<typeof vi.fn> };
  let mockRoleGrantAudit: { record: ReturnType<typeof vi.fn> };
  let mockAuthRevocation: { revokeUser: ReturnType<typeof vi.fn> };

  const workspaceId = "ws-1";
  const userId = "user-1";

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
      $queryRaw: vi.fn().mockResolvedValue([1]),
      project: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      },
      task: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        create: vi.fn()
      },
      timeLog: {
        groupBy: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn()
      },
      timesheetPeriod: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 })
      },
      category: {
        findFirst: vi.fn(),
        create: vi.fn()
      },
      team: {
        findUnique: vi.fn(),
        create: vi.fn()
      },
      teamMember: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      user: {
        findUnique: vi.fn()
      },
      workspaceMember: {
        findUnique: vi.fn()
      },
      workspace: {
        findUnique: vi.fn().mockResolvedValue({
          id: workspaceId,
          name: "Demo Workspace",
          tenantId: "t-1"
        })
      },
      userProjectColor: {
        findMany: vi.fn().mockResolvedValue([])
      }
    };
    mockAccess = {
      accessibleProjectIds: vi.fn(),
      assertCanAccessProject: vi.fn(),
      assertCanManageProject: vi.fn(),
      manageableProjectIds: vi.fn()
    };
    mockDispatch = {
      notify: vi.fn().mockResolvedValue(undefined),
      notifyWorkspaceAdmins: vi.fn().mockResolvedValue(undefined)
    };
    mockBulkQueue = {
      add: vi.fn().mockResolvedValue({ id: "job-1" }),
      getJob: vi.fn()
    };
    mockPlanLimit = { assertSeatsForEmails: vi.fn().mockResolvedValue(undefined) };
    mockRoleGrantPolicy = {
      assertProjectManagerGrant: vi.fn().mockResolvedValue(undefined)
    };
    mockRoleGrantAudit = { record: vi.fn().mockResolvedValue(undefined) };
    mockAuthRevocation = { revokeUser: vi.fn().mockResolvedValue(undefined) };
    service = new ProjectsService(
      mockPrisma,
      mockAccess,
      mockDispatch as never,
      mockBulkQueue as never,
      mockPlanLimit as never,
      mockRoleGrantPolicy as never,
      mockRoleGrantAudit as never,
      mockAuthRevocation as never
    );
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
    mockAccess.manageableProjectIds.mockResolvedValue(["p1"]);
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

  describe("remove", () => {
    it("blocks deletion of Uncategorized project", async () => {
      mockPrisma.project.findFirst.mockResolvedValue({
        id: "p1",
        workspaceId,
        name: "Uncategorized"
      });
      await expect(service.remove(workspaceId, "p1")).rejects.toThrow(
        /Cannot delete the default Uncategorized project/i
      );
      expect(mockPrisma.project.delete).not.toHaveBeenCalled();
    });

    it("re-associates logs of deleted project tasks and deletes the project", async () => {
      mockPrisma.project.findFirst
        .mockResolvedValueOnce({
          id: "p-deleted",
          workspaceId,
          name: "Project to delete"
        })
        .mockResolvedValueOnce({
          id: "uncat-project-id",
          workspaceId,
          name: "Uncategorized"
        });
      mockPrisma.team.findUnique.mockResolvedValue({ id: "uncat-team-id" });
      mockPrisma.category.findFirst.mockResolvedValue({
        id: "uncat-cat-id",
        name: "Uncategorized"
      });
      mockPrisma.task.findFirst.mockResolvedValue({
        id: "uncat-task-id",
        taskName: "Uncategorized Task"
      });
      mockPrisma.task.findMany.mockResolvedValue([{ id: "task-1" }, { id: "task-2" }]);
      mockPrisma.timeLog.updateMany.mockResolvedValue({ count: 5 });
      mockPrisma.project.delete.mockResolvedValue({ id: "p-deleted" });

      const result = await service.remove(workspaceId, "p-deleted");

      expect(mockPrisma.timeLog.updateMany).toHaveBeenCalledWith({
        where: { taskId: { in: ["task-1", "task-2"] } },
        data: { taskId: "uncat-task-id" }
      });
      expect(mockPrisma.project.delete).toHaveBeenCalledWith({ where: { id: "p-deleted" } });
      expect(result).toEqual({ ok: true });
    });
  });

  it("update waives open periods when approval settings change", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({
      id: "p1",
      workspaceId,
      name: "Alpha",
      color: "#236bfe",
      clientName: null,
      budgetHours: null,
      isActive: true,
      timesheetApprovalEnabled: true,
      timesheetApprovalPeriod: "weekly",
      timesheetApprovalEnabledAt: new Date("2025-01-01T00:00:00.000Z"),
      createdAt: new Date("2025-01-01T00:00:00.000Z")
    });
    mockPrisma.project.update.mockResolvedValue({
      id: "p1",
      workspaceId,
      name: "Alpha",
      color: "#236bfe",
      clientName: null,
      budgetHours: null,
      isActive: true,
      timesheetApprovalEnabled: false,
      timesheetApprovalPeriod: null,
      timesheetApprovalEnabledAt: null,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      workspace: { name: "Kloqra" }
    });

    await service.update(workspaceId, "p1", { timesheetApprovalEnabled: false });

    expect(mockPrisma.timesheetPeriod.updateMany).toHaveBeenCalledWith({
      where: {
        projectId: "p1",
        status: { in: ["DRAFT", "REJECTED"] }
      },
      data: { status: "WAIVED" }
    });
  });

  it("notifies project members when approval is disabled", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({
      id: "p1",
      workspaceId,
      name: "Alpha",
      color: "#236bfe",
      clientName: null,
      budgetHours: null,
      isActive: true,
      timesheetApprovalEnabled: true,
      timesheetApprovalPeriod: "weekly",
      timesheetApprovalEnabledAt: new Date("2025-01-01T00:00:00.000Z"),
      createdAt: new Date("2025-01-01T00:00:00.000Z")
    });
    mockPrisma.project.update.mockResolvedValue({
      id: "p1",
      workspaceId,
      name: "Alpha",
      color: "#236bfe",
      clientName: null,
      budgetHours: null,
      isActive: true,
      timesheetApprovalEnabled: false,
      timesheetApprovalPeriod: null,
      timesheetApprovalEnabledAt: null,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      workspace: { name: "Kloqra" }
    });
    mockPrisma.teamMember.findMany.mockResolvedValue([{ userId: "member-1" }]);

    await service.update(workspaceId, "p1", { timesheetApprovalEnabled: false });

    expect(mockDispatch.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "member-1",
        workspaceId,
        templateId: "project.approvalSettingsChanged",
        context: expect.objectContaining({
          projectName: "Alpha",
          projectId: "p1",
          changeSummary: "Timesheet approval disabled"
        })
      })
    );
  });

  describe("getMemberTeamRoster", () => {
    const projectId = "proj-abc";
    const teamId = "team-abc";
    const baseQuery = { page: 1, limit: 25 };

    const memberRow = {
      id: "tm-1",
      teamId,
      userId: "u-1",
      role: "MEMBER",
      isActive: true,
      createdAt: new Date("2026-06-15T10:00:00.000Z"),
      user: { name: "Sam Rivera", email: "sam@kloqra.dev" }
    };

    beforeEach(() => {
      mockAccess.assertCanAccessProject.mockResolvedValue(undefined);
      mockPrisma.team.findUnique.mockResolvedValue({ id: teamId, projectId });
      mockPrisma.teamMember.count = vi.fn().mockResolvedValue(1);
      mockPrisma.teamMember.findMany = vi.fn().mockResolvedValue([memberRow]);
    });

    it("calls assertCanAccessProject with the correct args", async () => {
      await service.getMemberTeamRoster(workspaceId, userId, "MEMBER", projectId, baseQuery);
      expect(mockAccess.assertCanAccessProject).toHaveBeenCalledWith(
        workspaceId,
        userId,
        "MEMBER",
        projectId
      );
    });

    it("returns items in standard paginated shape", async () => {
      const result = await service.getMemberTeamRoster(
        workspaceId,
        userId,
        "MEMBER",
        projectId,
        baseQuery
      );
      expect(result).toMatchObject({
        items: [
          expect.objectContaining({
            id: "tm-1",
            userId: "u-1",
            userName: "Sam Rivera",
            userEmail: "sam@kloqra.dev",
            role: "MEMBER",
            isActive: true,
            createdAt: "2026-06-15T10:00:00.000Z"
          })
        ],
        page: 1,
        limit: 25,
        total: 1,
        totalPages: 1
      });
    });

    it("passes search filter to teamMember.findMany where clause", async () => {
      await service.getMemberTeamRoster(workspaceId, userId, "MEMBER", projectId, {
        ...baseQuery,
        search: "sam"
      });
      const whereArg = mockPrisma.teamMember.findMany.mock.calls[0][0].where;
      expect(whereArg).toHaveProperty("user");
    });

    it("passes role filter to teamMember.findMany where clause", async () => {
      await service.getMemberTeamRoster(workspaceId, userId, "MEMBER", projectId, {
        ...baseQuery,
        role: "PROJECT_MANAGER"
      });
      const whereArg = mockPrisma.teamMember.findMany.mock.calls[0][0].where;
      expect(whereArg).toMatchObject({ role: "PROJECT_MANAGER" });
    });

    it("throws when assertCanAccessProject rejects", async () => {
      const { ErrorCodes } = await import("@kloqra/contracts");
      const { DomainException: DE } = await import("../../../common/errors/domain.exception");
      mockAccess.assertCanAccessProject.mockRejectedValue(
        new DE(ErrorCodes.FORBIDDEN, "Forbidden", 403)
      );
      await expect(
        service.getMemberTeamRoster(workspaceId, userId, "MEMBER", projectId, baseQuery)
      ).rejects.toThrow();
    });
  });

  describe("provisionTeamMembers", () => {
    const projectId = "proj-1";

    beforeEach(() => {
      mockAccess.assertCanManageProject.mockResolvedValue(undefined);
      mockPrisma.project.findFirst.mockResolvedValue({
        id: projectId,
        workspaceId,
        name: "Alpha"
      });
    });

    it("rejects non-admin actors", async () => {
      await expect(
        service.provisionTeamMembers(workspaceId, userId, "MEMBER", projectId, {
          members: [{ email: "a@example.com", name: "Ada" }]
        })
      ).rejects.toMatchObject({ code: ErrorCodes.FORBIDDEN });
    });

    it("enqueues chip invites onto the bulk-invite queue", async () => {
      const result = await service.provisionTeamMembers(workspaceId, userId, "ADMIN", projectId, {
        members: [
          { email: "a@example.com", name: "Ada" },
          { email: "b@example.com", name: "Bea" }
        ]
      });

      expect(mockPlanLimit.assertSeatsForEmails).toHaveBeenCalled();
      expect(mockBulkQueue.add).toHaveBeenCalledWith(
        "bulkProjectInviteJob",
        expect.objectContaining({
          workspaceId,
          projectId,
          invitedByUserId: userId,
          members: [
            { email: "a@example.com", name: "Ada", role: "MEMBER" },
            { email: "b@example.com", name: "Bea", role: "MEMBER" }
          ]
        }),
        expect.any(Object)
      );
      expect(result).toEqual({
        jobId: "job-1",
        status: "queued",
        enqueuedCount: 2
      });
    });
  });

  describe("getBulkInviteJobStatus", () => {
    const projectId = "proj-1";

    beforeEach(() => {
      mockAccess.assertCanManageProject.mockResolvedValue(undefined);
      mockPrisma.project.findFirst.mockResolvedValue({
        id: projectId,
        workspaceId,
        name: "Alpha"
      });
    });

    it("returns completed result for a matching job", async () => {
      mockBulkQueue.getJob.mockResolvedValue({
        data: { workspaceId, projectId },
        getState: vi.fn().mockResolvedValue("completed"),
        returnvalue: {
          successCount: 1,
          skippedCount: 0,
          projectAddedCount: 1,
          totalProcessed: 1
        }
      });

      await expect(
        service.getBulkInviteJobStatus(workspaceId, userId, "ADMIN", projectId, "job-1")
      ).resolves.toEqual({
        jobId: "job-1",
        status: "completed",
        result: {
          successCount: 1,
          skippedCount: 0,
          projectAddedCount: 1,
          totalProcessed: 1
        }
      });
    });

    it("hides jobs that belong to another project", async () => {
      mockBulkQueue.getJob.mockResolvedValue({
        data: { workspaceId, projectId: "other" },
        getState: vi.fn().mockResolvedValue("completed"),
        returnvalue: {}
      });

      await expect(
        service.getBulkInviteJobStatus(workspaceId, userId, "ADMIN", projectId, "job-1")
      ).rejects.toMatchObject({ code: ErrorCodes.NOT_FOUND });
    });
  });

  describe("updateTeamMember role grants", () => {
    beforeEach(() => {
      mockAccess.assertCanManageProject.mockResolvedValue(undefined);
      mockPrisma.project.findFirst.mockResolvedValue({
        id: "project-1",
        workspaceId,
        name: "Alpha"
      });
      mockPrisma.team.findUnique.mockResolvedValue({ id: "team-1", projectId: "project-1" });
      mockPrisma.teamMember.findFirst.mockResolvedValue({
        id: "member-1",
        userId: "target-1",
        role: "MEMBER",
        isActive: true
      });
      mockPrisma.teamMember.update.mockResolvedValue({
        id: "member-1",
        teamId: "team-1",
        userId: "target-1",
        role: "PROJECT_MANAGER",
        isActive: true,
        user: { name: "Target", email: "target@example.com" }
      });
    });

    it("authorizes, audits, and invalidates a project-manager grant", async () => {
      await service.updateTeamMember(
        workspaceId,
        "project-1",
        "member-1",
        { role: "PROJECT_MANAGER" },
        "ADMIN",
        "admin-1"
      );

      expect(mockRoleGrantPolicy.assertProjectManagerGrant).toHaveBeenCalledWith(
        {
          actorId: "admin-1",
          targetUserId: "target-1",
          tenantId: "t-1",
          workspaceId,
          projectId: "project-1",
          currentRole: "MEMBER",
          requestedRole: "PROJECT_MANAGER"
        },
        mockPrisma
      );
      expect(mockRoleGrantAudit.record).toHaveBeenCalledWith(
        mockPrisma,
        expect.objectContaining({
          actorUserId: "admin-1",
          targetUserId: "target-1",
          role: "PROJECT_MANAGER",
          outcome: "GRANTED"
        })
      );
      expect(mockAuthRevocation.revokeUser).toHaveBeenCalledWith("target-1");
    });

    it("does not mutate when authoritative grant authorization denies", async () => {
      mockRoleGrantPolicy.assertProjectManagerGrant.mockRejectedValue(
        new DomainException(ErrorCodes.FORBIDDEN, "Forbidden", HttpStatus.FORBIDDEN)
      );

      await expect(
        service.updateTeamMember(
          workspaceId,
          "project-1",
          "member-1",
          { role: "PROJECT_MANAGER" },
          "ADMIN",
          "stale-admin"
        )
      ).rejects.toMatchObject({ code: ErrorCodes.FORBIDDEN });

      expect(mockPrisma.teamMember.update).not.toHaveBeenCalled();
      expect(mockRoleGrantAudit.record).not.toHaveBeenCalled();
    });
  });
});
