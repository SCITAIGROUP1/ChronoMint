import { describe, expect, it } from "vitest";
import { roundExport } from "../../reporting/application/time-aggregation.service";

describe("TimeAggregationService export math", () => {
  it("matches reporting-style billable amount", () => {
    const hours = 2.5;
    const rate = 100;
    expect(roundExport(hours * rate)).toBe(250);
  });

  it("rounds hours to 2 decimals", () => {
    expect(roundExport(3600 / 3600 / 3)).toBe(0.33);
  });
});
