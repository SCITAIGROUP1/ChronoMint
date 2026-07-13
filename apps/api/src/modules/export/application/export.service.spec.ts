import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import { ExportService } from "./export.service";

describe("ExportService loadContext", () => {
  let service: ExportService;
  let mockPrisma: {
    workspace: { findUniqueOrThrow: ReturnType<typeof vi.fn> };
    user: { findUnique: ReturnType<typeof vi.fn> };
    project: { findUnique: ReturnType<typeof vi.fn> };
  };
  let mockAggregation: {
    fetchLogs: ReturnType<typeof vi.fn>;
    resolveRateMaps: ReturnType<typeof vi.fn>;
    buildAggregates: ReturnType<typeof vi.fn>;
    teamMemberUserIds: ReturnType<typeof vi.fn>;
  };

  const workspaceId = "ws-1";
  const taskId = "550e8400-e29b-41d4-a716-446655440000";
  const prevCommercial = process.env.CLIENT_COMMERCIAL_FEATURES_ENABLED;

  beforeEach(() => {
    mockPrisma = {
      workspace: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: workspaceId,
          name: "Acme",
          slug: "acme",
          settings: {}
        })
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({ name: "Member User" })
      },
      project: {
        findUnique: vi.fn().mockResolvedValue(null)
      }
    };
    mockAggregation = {
      fetchLogs: vi.fn().mockResolvedValue([]),
      resolveRateMaps: vi.fn().mockResolvedValue({ resolveRate: () => 0 }),
      buildAggregates: vi.fn().mockReturnValue({
        workspaceAgg: { totalHours: 0, billableHours: 0, billableAmount: 0 },
        byProject: new Map(),
        byUser: new Map(),
        byCategory: new Map()
      }),
      teamMemberUserIds: vi.fn()
    };
    service = new ExportService(mockPrisma as never, mockAggregation as never, {} as never);
  });

  afterEach(() => {
    if (prevCommercial === undefined) delete process.env.CLIENT_COMMERCIAL_FEATURES_ENABLED;
    else process.env.CLIENT_COMMERCIAL_FEATURES_ENABLED = prevCommercial;
  });

  it("passes taskId to fetchLogs", async () => {
    await service.loadContext(workspaceId, {
      from: "2025-06-01",
      to: "2025-06-07",
      taskId,
      billable: "all"
    });

    expect(mockAggregation.fetchLogs).toHaveBeenCalledWith(
      workspaceId,
      expect.objectContaining({ taskId })
    );
  });

  it("throws a validation error if the date range exceeds 12 months", async () => {
    await expect(
      service.loadContext(workspaceId, {
        from: "2025-01-01",
        to: "2026-02-01",
        billable: "all"
      })
    ).rejects.toThrow(/exceed 12 months/);
  });

  it("generateMember enforces member data isolation by passing the authenticated userId to loadContext", async () => {
    // We spy on loadContext or verify what mockAggregation.fetchLogs receives
    await service.generateMember(workspaceId, "user-isolation-123", {
      from: "2025-06-01",
      to: "2025-06-07",
      reportTypes: ["time_entries"],
      format: "xlsx"
    });

    expect(mockAggregation.fetchLogs).toHaveBeenCalledWith(
      workspaceId,
      expect.objectContaining({ userId: "user-isolation-123" })
    );
  });

  it("generateMember allows rate/amount columns when commercial features are off (strips them)", async () => {
    process.env.CLIENT_COMMERCIAL_FEATURES_ENABLED = "false";
    await service.generateMember(workspaceId, "user-1", {
      from: "2025-06-01",
      to: "2025-06-07",
      reportTypes: ["time_entries"],
      format: "csv",
      columns: {
        time_entries: ["project", "date", "hours", "billable", "rate", "amount", "description"]
      }
    });

    expect(mockAggregation.fetchLogs).toHaveBeenCalled();
  });

  it("generate rejects invoice report type when commercial features are off", async () => {
    process.env.CLIENT_COMMERCIAL_FEATURES_ENABLED = "false";
    await expect(
      service.generate(workspaceId, {
        from: "2025-06-01",
        to: "2025-06-07",
        billable: "all",
        groupBy: [],
        sheetLayout: "standard",
        reportTypes: ["invoice"],
        format: "csv"
      })
    ).rejects.toBeInstanceOf(DomainException);
  });
});
