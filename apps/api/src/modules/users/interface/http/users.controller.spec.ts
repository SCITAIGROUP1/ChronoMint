import { describe, expect, it, vi } from "vitest";
import type { RequestUser } from "../../../../common/decorators/current-user.decorator";
import { UsersController } from "./users.controller";

const tenantUser = {
  userId: "owner-1",
  tenantId: "tenant-1",
  tenantRole: "OWNER"
} as RequestUser;

const workspaceUser = {
  userId: "member-1",
  tenantId: "tenant-1",
  workspaceId: "workspace-1",
  role: "MEMBER"
} as RequestUser;

describe("UsersController canonical self authorization", () => {
  it("resolves tenant self-profile access from the session tenant", async () => {
    const users = {
      getTenantOperatorProfile: vi.fn().mockResolvedValue({ id: "owner-1" })
    };
    const authorization = {
      assertAllowed: vi.fn().mockResolvedValue({ allowed: true })
    };
    const controller = new UsersController(
      users as never,
      {} as never,
      {} as never,
      authorization as never
    );

    await expect(controller.getMe(tenantUser)).resolves.toEqual({ id: "owner-1" });
    expect(authorization.assertAllowed).toHaveBeenCalledWith({
      principalId: "owner-1",
      permission: "personal:ManageProfile",
      resource: { scope: "self", tenantId: "tenant-1" }
    });
  });

  it("resolves workspace self-profile access from the session workspace", async () => {
    const users = {
      getProfile: vi.fn().mockResolvedValue({ id: "member-1" })
    };
    const authorization = {
      assertAllowed: vi.fn().mockResolvedValue({ allowed: true })
    };
    const controller = new UsersController(
      users as never,
      {} as never,
      {} as never,
      authorization as never
    );

    await controller.getMe(workspaceUser);
    expect(authorization.assertAllowed).toHaveBeenCalledWith({
      principalId: "member-1",
      permission: "personal:ManageProfile",
      resource: { scope: "self", workspaceId: "workspace-1" }
    });
  });

  it("does not load a profile after a canonical denial", async () => {
    const users = {
      getProfile: vi.fn()
    };
    const authorization = {
      assertAllowed: vi.fn().mockRejectedValue(new Error("denied"))
    };
    const controller = new UsersController(
      users as never,
      {} as never,
      {} as never,
      authorization as never
    );

    await expect(controller.getMe(workspaceUser)).rejects.toThrow("denied");
    expect(users.getProfile).not.toHaveBeenCalled();
  });
});
