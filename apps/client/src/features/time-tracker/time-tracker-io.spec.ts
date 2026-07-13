import {
  DEFAULT_MEMBER_EXPORT_COLUMNS,
  ROUTES,
  TIMELOG_IMPORT_COLUMN_LABELS,
  TIMELOG_IMPORT_COLUMNS,
  TIMELOG_IMPORT_MAX_ROWS
} from "@kloqra/contracts";
import { describe, expect, it } from "vitest";

describe("time tracker import/export contracts", () => {
  it("exposes member import routes and template columns", () => {
    expect(ROUTES.TIMELOGS.IMPORT).toBe("/timelogs/import");
    expect(ROUTES.TIMELOGS.IMPORT_TEMPLATE).toBe("/timelogs/import/template");
    expect(ROUTES.EXPORT.ME).toBe("/export/me");
    expect(TIMELOG_IMPORT_COLUMNS).toEqual([
      "project",
      "task",
      "date",
      "start_time",
      "end_time",
      "description",
      "billable"
    ]);
    expect(TIMELOG_IMPORT_COLUMN_LABELS).toMatchObject({
      project: "Project",
      start_time: "Start",
      end_time: "End"
    });
    expect(TIMELOG_IMPORT_MAX_ROWS).toBe(500);
  });

  it("keeps import template labels aligned with member export time-entry headers", () => {
    expect(TIMELOG_IMPORT_COLUMN_LABELS.project).toBe("Project");
    expect(TIMELOG_IMPORT_COLUMN_LABELS.task).toBe("Task");
    expect(TIMELOG_IMPORT_COLUMN_LABELS.date).toBe("Date");
    expect(TIMELOG_IMPORT_COLUMN_LABELS.start_time).toBe("Start");
    expect(TIMELOG_IMPORT_COLUMN_LABELS.end_time).toBe("End");
    expect(TIMELOG_IMPORT_COLUMN_LABELS.description).toBe("Description");
    expect(TIMELOG_IMPORT_COLUMN_LABELS.billable).toBe("Billable");
  });

  it("default member time entry columns include rate/amount (API strips when commercial off)", () => {
    expect(DEFAULT_MEMBER_EXPORT_COLUMNS.time_entries).toEqual(
      expect.arrayContaining(["hours", "billable", "rate", "amount"])
    );
  });
});
