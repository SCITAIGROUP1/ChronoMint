import { describe, expect, it } from "vitest";
import { groupByForSheetLayout } from "./export-sheet-layout";

describe("groupByForSheetLayout", () => {
  it("replaces layout dimension when switching tab split", () => {
    expect(groupByForSheetLayout("tabs_per_member", ["project", "day"])).toEqual(["member", "day"]);
    expect(groupByForSheetLayout("tabs_per_project", ["member", "day"])).toEqual([
      "project",
      "day"
    ]);
    expect(groupByForSheetLayout("tabs_per_client", ["member", "week"])).toEqual([
      "client",
      "week"
    ]);
  });

  it("clears layout dimensions for standard workbook", () => {
    expect(groupByForSheetLayout("standard", ["member", "day"])).toEqual(["day"]);
  });
});
