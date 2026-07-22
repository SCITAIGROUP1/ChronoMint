import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { AccessPolicyRepository } from "./access-policy.repository";

describe("AccessPolicyRepository", () => {
  it("uses serializable transactions and retries database write conflicts", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError("write conflict", {
      code: "P2034",
      clientVersion: "test"
    });
    const prisma = {
      $transaction: vi
        .fn()
        .mockRejectedValueOnce(conflict)
        .mockImplementationOnce(async (work) => work({ marker: "tx" }))
    };
    const repository = new AccessPolicyRepository(prisma as never);
    const work = vi.fn().mockResolvedValue("done");

    await expect(repository.transaction(work)).resolves.toBe("done");
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(prisma.$transaction).toHaveBeenLastCalledWith(work, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    });
  });

  it("does not retry non-serialization failures", async () => {
    const prisma = { $transaction: vi.fn().mockRejectedValue(new Error("audit failed")) };
    const repository = new AccessPolicyRepository(prisma as never);

    await expect(repository.transaction(vi.fn())).rejects.toThrow("audit failed");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("loads only matching role targets plus project and workspace principal overrides", async () => {
    const tx = {
      tenantPermissionPolicyState: {
        findUnique: vi.fn().mockResolvedValue({ revision: 3 })
      },
      tenantRolePermissionOverride: {
        findMany: vi.fn().mockResolvedValue([])
      },
      principalPermissionOverride: {
        findMany: vi.fn().mockResolvedValue([])
      }
    };
    const repository = new AccessPolicyRepository({} as never);

    await repository.loadEvaluationSnapshot(
      {
        tenantId: "tenant-1",
        principalId: "user-1",
        permission: "project:ManageTasks",
        resource: {
          scope: "project",
          id: "project-1",
          workspaceId: "workspace-1"
        },
        bindings: [
          {
            role: "WORKSPACE_ADMIN",
            resourceId: "workspace-1",
            bindingScope: "workspace"
          },
          {
            role: "PROJECT_MANAGER",
            resourceId: "project-1",
            bindingScope: "project"
          }
        ]
      },
      tx as never
    );

    expect(tx.tenantRolePermissionOverride.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-1",
        permission: "project:ManageTasks",
        OR: [
          { role: "WORKSPACE_ADMIN", scope: "workspace", resourceId: "workspace-1" },
          { role: "PROJECT_MANAGER", scope: "project", resourceId: "project-1" }
        ]
      }
    });
    expect(tx.principalPermissionOverride.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-1",
        principalId: "user-1",
        permission: "project:ManageTasks",
        OR: [
          { scope: "project", resourceId: "project-1" },
          { scope: "workspace", resourceId: "workspace-1" }
        ]
      }
    });
  });
});
