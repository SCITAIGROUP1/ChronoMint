import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import { ProjectsService } from "./projects.service";

describe("ProjectsService", () => {
  let service: ProjectsService;
  let mockPrisma: any;
  let mockAccess: any;
  let mockBrevo: any;
  let mockBrevoDispatch: any;

  const workspaceId = "ws-1";
  const userId = "user-1";
  const projectId = "p1";

  beforeEach(() => {
    mockPrisma = {
      project: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn()
      },
      workspace: {
        findUniqueOrThrow: vi.fn()
      },
      team: {
        findUnique: vi.fn().mockResolvedValue({ id: "team-1" })
      },
      projectInvite: {
        create: vi.fn()
      },
      userProjectColor: {
        findMany: vi.fn().mockResolvedValue([])
      }
    };
    mockAccess = {
      accessibleProjectIds: vi.fn(),
      assertCanAccessProject: vi.fn()
    };
    mockBrevo = {
      sendProjectTeamInvite: vi.fn().mockResolvedValue(true)
    };
    mockBrevoDispatch = {
      maybeSendProjectAssignment: vi.fn().mockResolvedValue(undefined)
    };
    service = new ProjectsService(mockPrisma, mockAccess, mockBrevo, mockBrevoDispatch);
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

    const result = await service.list(workspaceId, userId, "MEMBER", { page: 1, limit: 20 });

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
  });

  it("create persists a project with default color", async () => {
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

  it("createTeamInvite sends email when address provided", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({
      id: projectId,
      workspaceId,
      name: "Alpha"
    });
    mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({ name: "Acme" });
    mockPrisma.projectInvite.create.mockResolvedValue({
      id: "inv-1",
      email: "member@example.com",
      expiresAt: new Date("2026-06-20")
    });
    process.env.FRONTEND_ORIGIN = "http://localhost:3000";

    const result = await service.createTeamInvite(workspaceId, projectId, userId, {
      email: "member@example.com"
    });

    expect(mockBrevo.sendProjectTeamInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "member@example.com",
        projectName: "Alpha",
        workspaceName: "Acme"
      })
    );
    expect(result.emailSent).toBe(true);
  });

  it("createTeamInvite keeps invite when email delivery fails", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({
      id: projectId,
      workspaceId,
      name: "Alpha"
    });
    mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({ name: "Acme" });
    mockPrisma.projectInvite.create.mockResolvedValue({
      id: "inv-1",
      email: "member@example.com",
      expiresAt: new Date("2026-06-20")
    });
    mockBrevo.sendProjectTeamInvite.mockRejectedValue(new Error("451 Invalid from"));
    process.env.FRONTEND_ORIGIN = "http://localhost:3000";

    const result = await service.createTeamInvite(workspaceId, projectId, userId, {
      email: "member@example.com"
    });

    expect(result.emailSent).toBe(false);
    expect(result.inviteUrl).toContain("/invite/");
  });

  it("createTeamInvite skips email when address omitted", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({
      id: projectId,
      workspaceId,
      name: "Alpha"
    });
    mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({ name: "Acme" });
    mockPrisma.projectInvite.create.mockResolvedValue({
      id: "inv-1",
      email: null,
      expiresAt: new Date("2026-06-20")
    });

    const result = await service.createTeamInvite(workspaceId, projectId, userId, {});

    expect(mockBrevo.sendProjectTeamInvite).not.toHaveBeenCalled();
    expect(result.emailSent).toBe(false);
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
