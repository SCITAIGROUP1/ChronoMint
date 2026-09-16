import { ROUTES } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { buildPersonalTimelogsQuery } from "./build-personal-timelogs-query";

describe("buildPersonalTimelogsQuery", () => {
  it("scopes the list to the signed-in user so admins do not load other members' entries", () => {
    const from = new Date("2026-08-17T00:00:00.000Z");
    const to = new Date("2026-08-24T00:00:00.000Z");
    const path = buildPersonalTimelogsQuery(from, to, "user-avery");
    expect(path.startsWith(`${ROUTES.TIMELOGS.LIST}?`)).toBe(true);
    const params = new URLSearchParams(path.slice(path.indexOf("?") + 1));
    expect(params.get("userId")).toBe("user-avery");
    expect(params.get("from")).toBe(from.toISOString());
    expect(params.get("to")).toBe(to.toISOString());
  });
});
