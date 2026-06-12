import { describe, expect, it } from "vitest";
import {
  buildProjectOverviewCategoryDonutData,
  buildProjectOverviewTaskBarData,
  formatOverviewHours
} from "./project-overview-chart-data";

describe("project overview chart data", () => {
  it("formats hours with one decimal", () => {
    expect(formatOverviewHours(44.25)).toBe("44.3h");
  });

  it("sorts task bar rows by total hours descending", () => {
    const rows = buildProjectOverviewTaskBarData([
      {
        taskId: "1",
        taskName: "Small",
        totalHours: 1,
        billableHours: 1
      },
      {
        taskId: "2",
        taskName: "Large",
        totalHours: 10,
        billableHours: 8
      }
    ]);

    expect(rows[0]?.name).toBe("Large");
    expect(rows[0]?.nonBillableHours).toBe(2);
  });

  it("maps category rows to donut chart data", () => {
    const rows = buildProjectOverviewCategoryDonutData([
      {
        categoryId: "c1",
        categoryName: "DevOps",
        totalHours: 5,
        billableHours: 5
      }
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("DevOps");
    expect(rows[0]?.value).toBe(5);
  });
});
