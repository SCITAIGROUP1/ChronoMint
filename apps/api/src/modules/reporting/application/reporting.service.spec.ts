import { describe, it, expect } from "vitest";

function round(n: number) {
  return Math.round(n * 100) / 100;
}

describe("ReportingService math", () => {
  it("rounds hours to 2 decimals", () => {
    expect(round(1.23456)).toBe(1.23);
  });

  it("computes billable amount", () => {
    const hours = 2.5;
    const rate = 100;
    expect(round(hours * rate)).toBe(250);
  });
});
