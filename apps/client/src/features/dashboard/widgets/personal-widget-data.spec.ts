import type { TimeLogDto } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import {
  buildCategorySplitData,
  buildProjectSplitData,
  buildWeeklyProgressData
} from "./personal-widget-data";

const logs: TimeLogDto[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    userId: "00000000-0000-4000-8000-000000000010",
    taskId: "00000000-0000-4000-8000-000000000101",
    startTime: "2026-07-20T09:00:00.000Z",
    endTime: "2026-07-20T11:00:00.000Z",
    durationSec: 7200,
    description: null,
    isBillable: true,
    source: "manual"
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    userId: "00000000-0000-4000-8000-000000000010",
    taskId: "00000000-0000-4000-8000-000000000102",
    startTime: "2026-07-21T09:00:00.000Z",
    endTime: "2026-07-21T10:00:00.000Z",
    durationSec: 3600,
    description: null,
    isBillable: false,
    source: "manual"
  }
];

const tasks = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    projectId: "00000000-0000-4000-8000-000000000201",
    taskName: "Build",
    categoryId: "00000000-0000-4000-8000-000000000301",
    categoryName: "Development"
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    projectId: "00000000-0000-4000-8000-000000000202",
    taskName: "Review",
    categoryId: "00000000-0000-4000-8000-000000000302",
    categoryName: "QA"
  }
];

const projects = [
  {
    id: "00000000-0000-4000-8000-000000000201",
    name: "Apollo",
    clientName: "Acme",
    color: "#2563eb"
  },
  {
    id: "00000000-0000-4000-8000-000000000202",
    name: "Beacon",
    clientName: null,
    color: "#16a34a"
  }
];

describe("personal dashboard widget data", () => {
  it("aggregates category and project distributions", () => {
    expect(buildCategorySplitData(logs, tasks).rows).toEqual([
      expect.objectContaining({ name: "Development", hours: 2, percentage: 66.7 }),
      expect.objectContaining({ name: "QA", hours: 1, percentage: 33.3 })
    ]);
    expect(buildProjectSplitData(logs, projects, tasks).rows).toEqual([
      expect.objectContaining({ name: "Apollo", clientName: "Acme", hours: 2 }),
      expect.objectContaining({ name: "Beacon", hours: 1 })
    ]);
  });

  it("groups weekly progress by timezone date and billability", () => {
    const rows = buildWeeklyProgressData(logs, "2026-07-20", "2026-07-26", "UTC");
    expect(rows).toHaveLength(7);
    expect(rows[0]).toMatchObject({ billable: 2, nonBillable: 0 });
    expect(rows[1]).toMatchObject({ billable: 0, nonBillable: 1 });
  });
});
