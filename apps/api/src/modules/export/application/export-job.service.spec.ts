import { exportJobStatusSchema } from "@kloqra/contracts";
import { describe, expect, it, vi } from "vitest";
import { ExportJobService } from "./export-job.service";

describe("export job contracts", () => {
  it("accepts job status values", () => {
    expect(exportJobStatusSchema.parse("queued")).toBe("queued");
    expect(exportJobStatusSchema.parse("ready")).toBe("ready");
  });
});

describe("ExportJobService", () => {
  it("creates and enqueues export job", async () => {
    const mockExportJob = {
      id: "job-1",
      workspaceId: "ws-1",
      requestedByUserId: "user-1",
      body: {
        from: "2025-06-01T00:00:00.000Z",
        to: "2025-06-07T00:00:00.000Z",
        reportTypes: ["time_entries"],
        format: "xlsx"
      },
      status: "queued",
      filename: null,
      contentType: null,
      byteSize: null,
      errorMessage: null,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      completedAt: null,
      expiresAt: new Date("2025-01-08T00:00:00.000Z")
    };

    const mockPrisma = {
      exportJob: {
        create: vi.fn().mockResolvedValue(mockExportJob)
      }
    };

    const mockExportQueue = {
      add: vi.fn().mockResolvedValue(undefined)
    };
    const authorization = {
      assertAllowed: vi.fn().mockResolvedValue({ allowed: true })
    };

    const service = new ExportJobService(
      mockPrisma as any,
      {} as any,
      {} as any,
      {} as any,
      authorization as any,
      mockExportQueue as any
    );

    const dto = {
      from: "2025-06-01T00:00:00.000Z",
      to: "2025-06-07T00:00:00.000Z",
      reportTypes: ["time_entries" as const],
      format: "xlsx" as const
    };

    const result = await service.create("ws-1", "user-1", dto);

    expect(mockPrisma.exportJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: "ws-1",
          requestedByUserId: "user-1",
          status: "queued"
        })
      })
    );

    expect(authorization.assertAllowed).toHaveBeenCalledWith({
      principalId: "user-1",
      permission: "workspace:CreateExport",
      resource: { scope: "workspace", workspaceId: "ws-1" }
    });
    expect(mockExportQueue.add).toHaveBeenCalledWith("runExport", {
      jobId: "job-1",
      actorUserId: "user-1"
    });
    expect(result.id).toBe("job-1");
  });

  it("does not persist or enqueue after permission revocation", async () => {
    const mockPrisma = { exportJob: { create: vi.fn() } };
    const queue = { add: vi.fn() };
    const authorization = {
      assertAllowed: vi.fn().mockRejectedValue(new Error("revoked"))
    };
    const service = new ExportJobService(
      mockPrisma as any,
      {} as any,
      {} as any,
      {} as any,
      authorization as any,
      queue as any
    );

    await expect(
      service.create("ws-2", "user-1", {
        from: "2025-06-01T00:00:00.000Z",
        to: "2025-06-07T00:00:00.000Z",
        reportTypes: ["time_entries"],
        format: "xlsx"
      })
    ).rejects.toThrow("revoked");
    expect(mockPrisma.exportJob.create).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it("reauthorizes the persisted actor before worker side effects", async () => {
    const mockPrisma = {
      exportJob: {
        findUnique: vi.fn().mockResolvedValue({
          id: "job-1",
          workspaceId: "ws-1",
          requestedByUserId: "user-1",
          status: "queued"
        }),
        update: vi.fn()
      }
    };
    const exportService = { generate: vi.fn() };
    const authorization = {
      assertAllowed: vi.fn().mockRejectedValue(new Error("revoked"))
    };
    const service = new ExportJobService(
      mockPrisma as any,
      exportService as any,
      {} as any,
      {} as any,
      authorization as any,
      {} as any
    );

    await expect(service.runJob("job-1", "user-1")).rejects.toThrow("revoked");
    expect(mockPrisma.exportJob.update).not.toHaveBeenCalled();
    expect(exportService.generate).not.toHaveBeenCalled();
  });
});
