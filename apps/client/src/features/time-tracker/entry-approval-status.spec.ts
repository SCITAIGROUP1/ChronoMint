import type {
  CategoryDto,
  ProjectDto,
  TaskDto,
  TimeLogDto,
  TimesheetPeriodDto
} from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import {
  isTimeEntryLocked,
  isTimeEntryReadOnly,
  resolveEntryApprovalStatus,
  buildSubmissionByKey
} from "./entry-approval-status";

const project: ProjectDto = {
  id: "proj-1",
  workspaceId: "ws-1",
  name: "Acme",
  color: "#000",
  clientName: null,
  budgetHours: null,
  isActive: true,
  timesheetApprovalEnabled: true,
  timesheetApprovalPeriod: "weekly"
};

const log: TimeLogDto = {
  id: "log-1",
  userId: "user-1",
  taskId: "task-1",
  startTime: "2026-06-09T13:04:00.000Z",
  endTime: "2026-06-09T14:04:00.000Z",
  durationSec: 3600,
  description: "Code review",
  isBillable: true,
  source: "manual"
};

const submittedPeriod: TimesheetPeriodDto = {
  id: "period-1",
  userId: "user-1",
  workspaceId: "ws-1",
  projectId: "proj-1",
  periodStart: "2026-06-09T00:00:00.000Z",
  periodEnd: "2026-06-15T23:59:59.999Z",
  approvalPeriod: "weekly",
  status: "SUBMITTED",
  note: null,
  reviewNote: null,
  reviewedBy: null,
  reviewedAt: null,
  submittedAt: "2026-06-10T00:00:00.000Z"
};

const task: TaskDto = {
  id: "task-1",
  projectId: "proj-1",
  categoryId: "cat-1",
  taskName: "Code review",
  billableDefault: true,
  isCommon: true,
  isActive: true,
  assignees: []
};

const category: CategoryDto = {
  id: "cat-1",
  workspaceId: "ws-1",
  name: "Development",
  description: null,
  isActive: true
};

describe("isTimeEntryReadOnly", () => {
  it("returns true when the project is inactive", () => {
    expect(
      isTimeEntryReadOnly(log, { ...project, isActive: false }, task, category, new Map())
    ).toBe(true);
  });

  it("returns true when the task is inactive", () => {
    expect(
      isTimeEntryReadOnly(log, project, { ...task, isActive: false }, category, new Map())
    ).toBe(true);
  });

  it("returns true when the category is inactive", () => {
    expect(
      isTimeEntryReadOnly(log, project, task, { ...category, isActive: false }, new Map())
    ).toBe(true);
  });
});

describe("isTimeEntryLocked", () => {
  it("returns true when the entry falls in a submitted period", () => {
    const submissionByKey = new Map([["proj-1:2026-06-09T00:00:00.000Z", submittedPeriod]]);

    expect(isTimeEntryLocked(log, project, submissionByKey)).toBe(true);
    expect(resolveEntryApprovalStatus(log, project, submissionByKey).status).toBe("SUBMITTED");
  });

  it("returns false when approval is disabled on the project", () => {
    const submissionByKey = new Map([["proj-1:2026-06-09T00:00:00.000Z", submittedPeriod]]);

    expect(
      isTimeEntryLocked(log, { ...project, timesheetApprovalEnabled: false }, submissionByKey)
    ).toBe(false);
  });

  it("returns false when the period is still draft", () => {
    const submissionByKey = new Map([
      [
        "proj-1:2026-06-09T00:00:00.000Z",
        { ...submittedPeriod, status: "DRAFT" as const, submittedAt: null }
      ]
    ]);

    expect(isTimeEntryLocked(log, project, submissionByKey)).toBe(false);
  });
});

describe("buildSubmissionByKey", () => {
  it("indexes submissions by project and period start", () => {
    const map = buildSubmissionByKey([submittedPeriod]);
    expect(map.get("proj-1:2026-06-09T00:00:00.000Z")).toEqual(submittedPeriod);
  });
});
