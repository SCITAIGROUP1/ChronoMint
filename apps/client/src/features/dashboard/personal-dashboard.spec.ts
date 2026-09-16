import type { TaskDto, TimeLogDto } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { filterPersonalDashboardData, type PersonalDashboardData } from "./personal-dashboard";

function log(
  partial: Partial<TimeLogDto> & Pick<TimeLogDto, "id" | "taskId" | "durationSec">
): TimeLogDto {
  return {
    userId: "user-1",
    description: null,
    startTime: "2026-07-20T10:00:00.000Z",
    endTime: "2026-07-20T11:00:00.000Z",
    isBillable: true,
    source: "manual",
    classification: "PROJECT",
    ...partial
  };
}

function task(
  partial: Partial<TaskDto> & Pick<TaskDto, "id" | "projectId" | "categoryId">
): TaskDto {
  return {
    taskName: "Task",
    ...partial
  } as TaskDto;
}

function baseData(overrides: Partial<PersonalDashboardData> = {}): PersonalDashboardData {
  return {
    actionableSubmissions: 0,
    assignedProjects: 2,
    isLoading: false,
    logs: [
      log({ id: "log-1", taskId: "task-1", durationSec: 3600 }),
      log({
        id: "log-2",
        taskId: "task-2",
        durationSec: 7200,
        startTime: "2026-07-21T10:00:00.000Z",
        endTime: "2026-07-21T12:00:00.000Z"
      })
    ],
    projects: [],
    recentSeconds: 10800,
    startDate: "2026-07-20",
    endDate: "2026-07-26",
    submissions: [],
    tasks: [
      task({ id: "task-1", projectId: "project-1", categoryId: "category-1", taskName: "Task 1" }),
      task({ id: "task-2", projectId: "project-2", categoryId: "category-2", taskName: "Task 2" })
    ],
    timezone: "UTC",
    todayLogs: [],
    todaySeconds: 0,
    workspaceId: "ws-1",
    ...overrides
  };
}

describe("filterPersonalDashboardData", () => {
  it("returns original data when no filters are set", () => {
    const data = baseData();
    expect(filterPersonalDashboardData(data, {})).toBe(data);
  });

  it("filters logs by project", () => {
    const filtered = filterPersonalDashboardData(baseData(), { projectIds: ["project-1"] });
    expect(filtered.logs.map((item) => item.id)).toEqual(["log-1"]);
    expect(filtered.recentSeconds).toBe(3600);
  });

  it("filters logs by category and task", () => {
    const filtered = filterPersonalDashboardData(baseData(), {
      categoryId: "category-2",
      taskId: "task-2"
    });
    expect(filtered.logs.map((item) => item.id)).toEqual(["log-2"]);
  });

  it("filters logs by multiple categories", () => {
    const filtered = filterPersonalDashboardData(baseData(), {
      categoryId: ["category-1", "category-2"]
    });
    expect(filtered.logs.map((item) => item.id)).toEqual(["log-1", "log-2"]);
  });

  it("keeps non-project logs when include is set with a project filter", () => {
    const filtered = filterPersonalDashboardData(
      baseData({
        logs: [
          log({ id: "log-1", taskId: "task-1", durationSec: 3600 }),
          log({
            id: "leave-1",
            taskId: null,
            durationSec: 28800,
            classification: "LEAVE_FULL"
          })
        ]
      }),
      { projectIds: ["project-1"], nonProjectTime: "include" }
    );
    expect(filtered.logs.map((item) => item.id)).toEqual(["log-1", "leave-1"]);
  });

  it("excludes non-project logs from personal widgets", () => {
    const filtered = filterPersonalDashboardData(
      baseData({
        logs: [
          log({ id: "log-1", taskId: "task-1", durationSec: 3600 }),
          log({
            id: "leave-1",
            taskId: null,
            durationSec: 28800,
            classification: "LEAVE_FULL"
          })
        ]
      }),
      { nonProjectTime: "exclude" }
    );
    expect(filtered.logs.map((item) => item.id)).toEqual(["log-1"]);
    expect(filtered.recentSeconds).toBe(3600);
  });

  it("shows only non-project logs and ignores project filters", () => {
    const filtered = filterPersonalDashboardData(
      baseData({
        logs: [
          log({ id: "log-1", taskId: "task-1", durationSec: 3600 }),
          log({
            id: "holiday-1",
            taskId: null,
            durationSec: 28800,
            classification: "PUBLIC_HOLIDAY"
          })
        ]
      }),
      { projectIds: ["project-1"], nonProjectTime: "only" }
    );
    expect(filtered.logs.map((item) => item.id)).toEqual(["holiday-1"]);
  });
});
