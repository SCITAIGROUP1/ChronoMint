import ExcelJS from "exceljs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TaskImportService } from "./task-import.service";

type AnyMock = ReturnType<typeof vi.fn>;

describe("TaskImportService", () => {
  let service: TaskImportService;
  let createMock: AnyMock;
  let updateMock: AnyMock;
  let listMock: AnyMock;
  let assertAllowed: AnyMock;
  let evaluate: AnyMock;
  let prisma: {
    project: { findMany: AnyMock };
    category: { findMany: AnyMock };
    task: { findFirst: AnyMock };
  };

  beforeEach(() => {
    createMock = vi.fn().mockResolvedValue({
      id: "task-1",
      projectId: "proj-1",
      categoryId: "cat-1",
      taskName: "K8s rollout",
      billableDefault: true,
      isCommon: true,
      isActive: true,
      assignees: []
    });
    updateMock = vi.fn().mockResolvedValue({});
    listMock = vi
      .fn()
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 1000, totalPages: 0 });
    assertAllowed = vi.fn().mockResolvedValue({ allowed: true });
    evaluate = vi.fn().mockResolvedValue({ allowed: true });
    prisma = {
      project: {
        findMany: vi.fn().mockResolvedValue([
          { id: "proj-1", name: "Platform API", isActive: true },
          { id: "proj-2", name: "Mobile App", isActive: false }
        ])
      },
      category: {
        findMany: vi.fn().mockResolvedValue([
          { id: "cat-1", name: "Development", isActive: true },
          { id: "cat-2", name: "Legacy", isActive: false }
        ])
      },
      task: {
        findFirst: vi.fn().mockResolvedValue(null)
      }
    };
    service = new TaskImportService(
      prisma as never,
      { create: createMock, update: updateMock, list: listMock } as never,
      { assertAllowed, evaluate } as never
    );
  });

  it("imports valid CSV rows as common tasks", async () => {
    const csv = [
      "Project,Category,Task,Billable,Active",
      "Platform API,Development,K8s rollout,TRUE,TRUE"
    ].join("\n");

    const result = await service.importFile({
      workspaceId: "ws-1",
      userId: "u-1",
      role: "ADMIN",
      managedProjectIds: [],
      buffer: Buffer.from(csv),
      filename: "tasks.csv"
    });

    expect(result).toEqual({ created: 1, skipped: 0, failed: [] });
    expect(createMock).toHaveBeenCalledWith(
      "ws-1",
      "u-1",
      "ADMIN",
      expect.objectContaining({
        projectId: "proj-1",
        categoryId: "cat-1",
        taskName: "K8s rollout",
        billableDefault: true,
        isCommon: true,
        assigneeUserIds: []
      })
    );
  });

  it("skips duplicate task names in the same project", async () => {
    prisma.task.findFirst.mockResolvedValue({ id: "existing" });
    const csv = ["Project,Category,Task", "Platform API,Development,K8s rollout"].join("\n");

    const result = await service.importFile({
      workspaceId: "ws-1",
      userId: "u-1",
      role: "ADMIN",
      managedProjectIds: [],
      buffer: Buffer.from(csv),
      filename: "tasks.csv"
    });

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("fails unknown project and inactive category", async () => {
    const csv = [
      "Project,Category,Task",
      "Missing Project,Development,A",
      "Platform API,Legacy,B"
    ].join("\n");

    const result = await service.importFile({
      workspaceId: "ws-1",
      userId: "u-1",
      role: "ADMIN",
      managedProjectIds: [],
      buffer: Buffer.from(csv),
      filename: "tasks.csv"
    });

    expect(result.created).toBe(0);
    expect(result.failed).toEqual([
      { row: 2, reason: 'Unknown project "Missing Project"' },
      { row: 3, reason: 'Cannot use inactive category "Legacy"' }
    ]);
  });

  it("fails inactive projects", async () => {
    const csv = ["Project,Category,Task", "Mobile App,Development,Ship"].join("\n");
    const result = await service.importFile({
      workspaceId: "ws-1",
      userId: "u-1",
      role: "ADMIN",
      managedProjectIds: [],
      buffer: Buffer.from(csv),
      filename: "tasks.csv"
    });
    expect(result.failed).toEqual([{ row: 2, reason: 'Project "Mobile App" is inactive' }]);
  });

  it("fails when ManageTasks is denied", async () => {
    assertAllowed.mockRejectedValue(
      new Error('Not allowed to manage tasks on project "Platform API"')
    );
    const csv = ["Project,Category,Task", "Platform API,Development,Ship"].join("\n");
    const result = await service.importFile({
      workspaceId: "ws-1",
      userId: "u-1",
      role: "MEMBER",
      managedProjectIds: [],
      buffer: Buffer.from(csv),
      filename: "tasks.csv"
    });
    expect(result.failed[0]?.reason).toContain("Not allowed");
  });

  it("deactivates after create when Active is FALSE", async () => {
    const csv = ["Project,Category,Task,Active", "Platform API,Development,Ship,FALSE"].join("\n");
    const result = await service.importFile({
      workspaceId: "ws-1",
      userId: "u-1",
      role: "ADMIN",
      managedProjectIds: [],
      buffer: Buffer.from(csv),
      filename: "tasks.csv"
    });
    expect(result.created).toBe(1);
    expect(updateMock).toHaveBeenCalledWith("ws-1", "u-1", "ADMIN", "task-1", { isActive: false });
  });

  it("builds a template with Project/Category dropdowns and protected Reference sheet", async () => {
    prisma.project.findMany.mockResolvedValue([{ id: "proj-1", name: "Platform API" }]);
    prisma.category.findMany.mockResolvedValue([{ id: "cat-1", name: "Development" }]);

    const { PassThrough } = await import("node:stream");
    const stream = new PassThrough();
    const buffers: Buffer[] = [];
    stream.on("data", (c) => buffers.push(Buffer.from(c)));
    const done = new Promise<Buffer>((resolve) => {
      stream.on("end", () => resolve(Buffer.concat(buffers)));
    });

    Object.assign(stream, {
      setHeader: vi.fn()
    });

    await service.generateTemplate({
      workspaceId: "ws-1",
      userId: "u-1",
      role: "ADMIN",
      managedProjectIds: [],
      res: stream as never
    });

    const buffer = await done;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

    const tasksSheet = workbook.getWorksheet("Tasks");
    const referenceSheet = workbook.getWorksheet("Reference");
    expect(tasksSheet).toBeTruthy();
    expect(referenceSheet).toBeTruthy();
    expect(tasksSheet!.getCell("A2").dataValidation?.type).toBe("list");
    expect(tasksSheet!.getCell("B2").dataValidation?.type).toBe("list");
    expect(String(tasksSheet!.getCell("A2").dataValidation?.formulae?.[0])).toContain(
      "Reference!$A$"
    );
    expect(referenceSheet!.getCell("A2").value).toBe("Platform API");
    expect(referenceSheet!.getCell("B2").value).toBe("Development");
  });

  it("resolves project and category by UUID", async () => {
    prisma.project.findMany.mockResolvedValue([
      { id: "550e8400-e29b-41d4-a716-446655440000", name: "Platform API", isActive: true }
    ]);
    prisma.category.findMany.mockResolvedValue([
      { id: "550e8400-e29b-41d4-a716-446655440001", name: "Development", isActive: true }
    ]);
    const uuidCsv = [
      "Project,Category,Task",
      "550e8400-e29b-41d4-a716-446655440000,550e8400-e29b-41d4-a716-446655440001,By UUID"
    ].join("\n");

    const result = await service.importFile({
      workspaceId: "ws-1",
      userId: "u-1",
      role: "ADMIN",
      managedProjectIds: [],
      buffer: Buffer.from(uuidCsv),
      filename: "tasks.csv"
    });

    expect(result.created).toBe(1);
    expect(createMock).toHaveBeenCalledWith(
      "ws-1",
      "u-1",
      "ADMIN",
      expect.objectContaining({
        projectId: "550e8400-e29b-41d4-a716-446655440000",
        categoryId: "550e8400-e29b-41d4-a716-446655440001",
        isCommon: true
      })
    );
  });
});
