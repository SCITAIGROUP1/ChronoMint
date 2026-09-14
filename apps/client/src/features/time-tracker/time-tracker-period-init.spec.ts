import { describe, expect, it } from "vitest";
import { inclusiveDateKeysFromPeriod } from "./time-tracker-period";

describe("admin time tracker period initialization", () => {
  it("derives this_week keys from the provided timezone instead of hardcoded UTC", () => {
    const utc = inclusiveDateKeysFromPeriod("this_week", "UTC", "monday");
    const colombo = inclusiveDateKeysFromPeriod("this_week", "Asia/Colombo", "monday");

    expect(utc.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(utc.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(colombo.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(colombo.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(colombo.from <= colombo.to).toBe(true);
  });
});
