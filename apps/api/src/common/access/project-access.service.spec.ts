import { ErrorCodes } from "@kloqra/contracts";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DomainException } from "../errors/domain.exception";
import { AuthorizationPolicyService } from "./authorization-policy.service";
import { ProjectAccessService } from "./project-access.service";

describe("ProjectAccessService", () => {
  let prisma: {
    project: { findMany: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn> };
    teamMember: { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
    task: { findFirst: ReturnType<typeof vi.fn> };
    taskAssignee: { findFirst: ReturnType<typeof vi.fn> };
  };
  let bindings: { forProject: ReturnType<typeof vi.fn> };
  let service: ProjectAccessService;

  beforeEach(() => {
    prisma = {
      project: { findMany: vi.fn(), findFirst: vi.fn() },
      teamMember: { findFirst: vi.fn(), findMany: vi.fn() },
      task: { findFirst: vi.fn() },
      taskAssignee: { findFirst: vi.fn() }
    };
    bindings = { forProject: vi.fn() };
    service = new ProjectAccessService(
      prisma as never,
      bindings as never,
      new AuthorizationPolicyService()
    );
  });

  it("returns led project ids for MEMBER", async () => {
    prisma.teamMember.findMany.mockResolvedValue([
      { team: { projectId: "proj-1" } },
      { team: { projectId: "proj-2" } }
    ]);
    const ids = await service.managedProjectIds("ws-1", "user-1");
    expect(ids).toEqual(["proj-1", "proj-2"]);
  });

  it("assertCanManageProject allows ADMIN", async () => {
    bindings.forProject.mockResolvedValue({
      isolationPassed: true,
      bindings: [{ role: "WORKSPACE_ADMIN", resourceId: "ws-1" }]
    });
    await expect(
      service.assertCanManageProject("ws-1", "admin-1", "ADMIN", "proj-1")
    ).resolves.toBeUndefined();
  });

  it("assertCanManageProject rejects MEMBER without PROJECT_MANAGER", async () => {
    bindings.forProject.mockResolvedValue({
      isolationPassed: true,
      bindings: [{ role: "WORKSPACE_MEMBER", resourceId: "ws-1" }]
    });
    await expect(
      service.assertCanManageProject("ws-1", "user-1", "MEMBER", "proj-1")
    ).rejects.toBeInstanceOf(DomainException);
  });

  it("assertCanManageProject limits PROJECT_MANAGER to the bound project", async () => {
    bindings.forProject.mockResolvedValue({
      isolationPassed: true,
      bindings: [{ role: "PROJECT_MANAGER", resourceId: "proj-other" }]
    });

    await expect(
      service.assertCanManageProject("ws-1", "manager-1", "MEMBER", "proj-1")
    ).rejects.toMatchObject({ code: ErrorCodes.FORBIDDEN });
  });

  it("assertCanManageProject denies an isolation failure before role allows", async () => {
    bindings.forProject.mockResolvedValue({
      isolationPassed: false,
      bindings: [{ role: "WORKSPACE_ADMIN", resourceId: "ws-1" }]
    });

    await expect(
      service.assertCanManageProject("ws-1", "admin-1", "ADMIN", "proj-1")
    ).rejects.toMatchObject({ code: ErrorCodes.FORBIDDEN });
  });

  describe("assertTaskLoggable", () => {
    it("allows active project, category, and task", () => {
      expect(() =>
        service.assertTaskLoggable({
          id: "t1",
          projectId: "p1",
          isCommon: true,
          isActive: true,
          category: { isActive: true },
          project: { isActive: true }
        })
      ).not.toThrow();
    });

    it("rejects inactive project", () => {
      try {
        service.assertTaskLoggable({
          id: "t1",
          projectId: "p1",
          isCommon: true,
          isActive: true,
          category: { isActive: true },
          project: { isActive: false }
        });
        expect.fail("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(DomainException);
        expect((err as DomainException).code).toBe(ErrorCodes.ENTITY_INACTIVE);
      }
    });
  });

  describe("assertCanLogTask", () => {
    it("rejects logging on inactive task for admin", async () => {
      prisma.task.findFirst.mockResolvedValue({
        id: "t1",
        projectId: "p1",
        isCommon: true,
        isActive: false,
        category: { isActive: true },
        project: { isActive: true }
      });
      bindings.forProject.mockResolvedValue({
        isolationPassed: true,
        bindings: [{ role: "WORKSPACE_ADMIN", resourceId: "w1" }]
      });

      await expect(service.assertCanLogTask("w1", "u1", "ADMIN", "t1")).rejects.toBeInstanceOf(
        DomainException
      );
    });
  });

  describe("accessibleProjectIds", () => {
    it("includes inactive projects for members on the team", async () => {
      prisma.teamMember.findMany.mockResolvedValue([
        { team: { projectId: "p-inactive" } },
        { team: { projectId: "p-active" } }
      ]);

      const ids = await service.accessibleProjectIds("w1", "u1", "MEMBER");

      expect(ids).toEqual(["p-inactive", "p-active"]);
      expect(prisma.teamMember.findMany).toHaveBeenCalledWith({
        where: {
          userId: "u1",
          isActive: true,
          team: { project: { workspaceId: "w1" } }
        },
        select: { team: { select: { projectId: true } } }
      });
    });
  });

  describe("assertCanAccessProject", () => {
    it("allows members to access inactive projects they belong to", async () => {
      prisma.teamMember.findFirst.mockResolvedValue({ id: "tm1" });

      await expect(
        service.assertCanAccessProject("w1", "u1", "MEMBER", "p-inactive")
      ).resolves.toBeUndefined();

      expect(prisma.teamMember.findFirst).toHaveBeenCalledWith({
        where: {
          userId: "u1",
          isActive: true,
          team: { projectId: "p-inactive", project: { workspaceId: "w1" } }
        }
      });
    });
  });
});
