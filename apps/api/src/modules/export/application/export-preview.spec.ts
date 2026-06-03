import { exportPreviewBodySchema, exportReportTypeSchema } from "@chronomint/contracts";
import { describe, expect, it } from "vitest";

describe("export preview contracts", () => {
  it("accepts preview body without format", () => {
    const parsed = exportPreviewBodySchema.parse({
      from: "2025-06-01T00:00:00.000Z",
      to: "2025-06-30T23:59:59.000Z",
      reportTypes: ["time_entries", "by_project"]
    });
    expect(parsed.reportTypes).toHaveLength(2);
  });

  it("includes all admin report types", () => {
    expect(exportReportTypeSchema.options).toContain("invoice");
    expect(exportReportTypeSchema.options).toContain("utilization");
  });
});
