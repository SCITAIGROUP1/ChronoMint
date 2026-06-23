import { DEFAULT_PLAN_LIMITS, PLAN_SLUGS } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";

describe("account billing plan catalog", () => {
  it("exposes starter and pro upgrade tiers", () => {
    expect(DEFAULT_PLAN_LIMITS[PLAN_SLUGS.STARTER].maxWorkspaces).toBe(3);
    expect(DEFAULT_PLAN_LIMITS[PLAN_SLUGS.PRO].maxSeats).toBe(50);
  });
});
