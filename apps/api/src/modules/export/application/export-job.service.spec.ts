import { exportJobStatusSchema } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";

describe("export job contracts", () => {
  it("accepts job status values", () => {
    expect(exportJobStatusSchema.parse("queued")).toBe("queued");
    expect(exportJobStatusSchema.parse("ready")).toBe("ready");
  });
});
