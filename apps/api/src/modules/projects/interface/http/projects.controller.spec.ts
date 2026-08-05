import { describe, expect, it, vi } from "vitest";
import {
  REQUIRE_PERMISSION_KEY,
  type RequiredPermissionMetadata
} from "../../../../common/decorators/require-permission.decorator";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { ProjectsController } from "./projects.controller";

const metadataFor = (method: keyof ProjectsController) =>
  Reflect.getMetadata(
    REQUIRE_PERMISSION_KEY,
    ProjectsController.prototype[method]
  ) as RequiredPermissionMetadata;

describe("ProjectsController canonical authorization", () => {
  it("uses distinct project permissions instead of a coarse manager role", () => {
    expect(metadataFor("get").permission).toBe("project:Read");
    expect(metadataFor("update").permission).toBe("project:Update");
    expect(metadataFor("getTeam").permission).toBe("project:ListTeam");
    expect(metadataFor("addTeamMember").permission).toBe("project:ManageTeam");
  });

  it("passes the session workspace as an isolation boundary for project routes", async () => {
    const metadata = metadataFor("updateTeamMember");
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(metadata) };
    const authorization = { assertAllowed: vi.fn().mockResolvedValue({ allowed: true }) };
    const guard = new PermissionGuard(reflector as never, authorization as never);
    const context = {
      getHandler: () => ProjectsController.prototype.updateTeamMember,
      getClass: () => ProjectsController,
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            userId: "manager-1",
            workspaceId: "workspace-a",
            tenantId: "tenant-1"
          },
          params: { projectId: "project-in-workspace-b", memberId: "member-2" }
        })
      })
    };

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(authorization.assertAllowed).toHaveBeenCalledWith({
      principalId: "manager-1",
      permission: "project:ManageTeam",
      resource: {
        scope: "project",
        projectId: "project-in-workspace-b",
        expectedWorkspaceId: "workspace-a",
        expectedTenantId: undefined
      }
    });
  });

  it("propagates a canonical denial before the member operation runs", async () => {
    const metadata = metadataFor("updateTeamMember");
    const denial = new Error("cross-project member denied");
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(metadata) };
    const authorization = { assertAllowed: vi.fn().mockRejectedValue(denial) };
    const guard = new PermissionGuard(reflector as never, authorization as never);
    const context = {
      getHandler: () => ProjectsController.prototype.updateTeamMember,
      getClass: () => ProjectsController,
      switchToHttp: () => ({
        getRequest: () => ({
          user: { userId: "manager-1", workspaceId: "workspace-a" },
          params: { projectId: "project-b", memberId: "member-from-project-c" }
        })
      })
    };

    await expect(guard.canActivate(context as never)).rejects.toBe(denial);
  });
});
