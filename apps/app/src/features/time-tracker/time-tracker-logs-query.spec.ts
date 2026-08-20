import { ROUTES } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { buildTimeTrackerLogsQuery } from "./time-tracker-logs-query";

describe("buildTimeTrackerLogsQuery", () => {
  it("includes userId so personal tracker does not mix in other members", () => {
    const path = buildTimeTrackerLogsQuery({
      from: new Date("2026-08-17T00:00:00.000Z"),
      to: new Date("2026-08-24T00:00:00.000Z"),
      userId: ["user-avery"]
    });
    const params = new URLSearchParams(path.slice(path.indexOf("?") + 1));
    expect(path.startsWith(`${ROUTES.TIMELOGS.LIST}?`)).toBe(true);
    expect(params.get("userId")).toBe("user-avery");
  });
});
