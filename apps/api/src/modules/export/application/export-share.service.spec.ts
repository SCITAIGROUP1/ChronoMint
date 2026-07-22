import { describe, expect, it, vi } from "vitest";
import { ExportShareService } from "./export-share.service";

describe("ExportShareService authorization", () => {
  const dto = {
    body: {
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-07T23:59:59.999Z",
      reportTypes: ["time_entries" as const]
    },
    expiresInDays: 7
  };

  it("authorizes the actor before creating a workspace share", async () => {
    const prisma = {
      reportShare: {
        create: vi.fn().mockResolvedValue({
          id: "share-1",
          token: "token-1",
          expiresAt: new Date("2026-08-01T00:00:00.000Z")
        })
      }
    };
    const authorization = { assertAllowed: vi.fn().mockResolvedValue({ allowed: true }) };
    const service = new ExportShareService(
      prisma as never,
      {} as never,
      {} as never,
      authorization as never
    );

    await service.create("workspace-1", "user-1", dto, "https://admin.example.com");

    expect(authorization.assertAllowed).toHaveBeenCalledWith({
      principalId: "user-1",
      permission: "workspace:ManageExportShares",
      resource: { scope: "workspace", workspaceId: "workspace-1" }
    });
    expect(prisma.reportShare.create).toHaveBeenCalledOnce();
  });

  it("does not create a share after permission revocation", async () => {
    const prisma = { reportShare: { create: vi.fn() } };
    const authorization = { assertAllowed: vi.fn().mockRejectedValue(new Error("revoked")) };
    const service = new ExportShareService(
      prisma as never,
      {} as never,
      {} as never,
      authorization as never
    );

    await expect(
      service.create("workspace-2", "user-1", dto, "https://admin.example.com")
    ).rejects.toThrow("revoked");
    expect(prisma.reportShare.create).not.toHaveBeenCalled();
  });
});
