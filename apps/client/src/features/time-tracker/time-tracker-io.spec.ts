import { ROUTES, TIMELOG_IMPORT_COLUMNS, TIMELOG_IMPORT_MAX_ROWS } from "@kloqra/contracts";
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
    expect(TIMELOG_IMPORT_MAX_ROWS).toBe(500);
  });
});
