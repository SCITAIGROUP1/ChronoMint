import { describe, expect, it, vi } from "vitest";
import { DomainException } from "../errors/domain.exception";
import { PermissionGuard } from "./permission.guard";

const contextFor = (request: unknown) =>
  ({
    getHandler: () => "handler",
    getClass: () => "controller",
    switchToHttp: () => ({ getRequest: () => request })
  }) as never;

describe("PermissionGuard", () => {
  it("uses only the explicitly declared route parameter resolver", async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue({
        permission: "project:ManageTasks",
        resolver: {
          scope: "project",
          projectId: { source: "route", parameter: "projectKey" },
          expectedWorkspaceId: { source: "session", field: "workspaceId" }
        }
      })
    };
    const authorization = { assertAllowed: vi.fn().mockResolvedValue({ allowed: true }) };
    const guard = new PermissionGuard(reflector as never, authorization as never);

    await expect(
      guard.canActivate(
        contextFor({
          user: { userId: "user-1", workspaceId: "workspace-1" },
          params: { id: "wrong-id", projectKey: "project-1" }
        })
      )
    ).resolves.toBe(true);
    expect(authorization.assertAllowed).toHaveBeenCalledWith({
      principalId: "user-1",
      permission: "project:ManageTasks",
      resource: {
        scope: "project",
        projectId: "project-1",
        expectedWorkspaceId: "workspace-1",
        expectedTenantId: undefined
      }
    });
  });

  it("fails closed instead of guessing a conventional id parameter", async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue({
        permission: "project:ManageTasks",
        resolver: {
          scope: "project",
          projectId: { source: "route", parameter: "projectId" }
        }
      })
    };
    const authorization = { assertAllowed: vi.fn() };
    const guard = new PermissionGuard(reflector as never, authorization as never);

    await expect(
      guard.canActivate(
        contextFor({
          user: { userId: "user-1" },
          params: { id: "project-1" }
        })
      )
    ).rejects.toBeInstanceOf(DomainException);
    expect(authorization.assertAllowed).not.toHaveBeenCalled();
  });
});
