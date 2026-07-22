import { describe, expect, it } from "vitest";
import {
  buildGlobalSearchPageGroups,
  buildWorkspacePageGroups,
  filterAppNavItems,
  toPageSearchResult
} from "./global-search-nav";
import { APP_NAV_ITEMS } from "@/config/app-nav";

describe("global-search-nav", () => {
  it("returns all pages when query is empty", () => {
    expect(filterAppNavItems("")).toHaveLength(APP_NAV_ITEMS.length);
  });

  it("filters pages by label", () => {
    const matches = filterAppNavItems("billing");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.label).toBe("Hourly rates");
  });

  it("filters pages by keyword", () => {
    const matches = filterAppNavItems("timesheet");
    expect(matches.some((item) => item.label === "Approvals")).toBe(true);
  });

  it("maps nav items to page search results", () => {
    const item = filterAppNavItems("dashboard")[0];
    expect(item).toBeDefined();
    expect(toPageSearchResult(item!)).toEqual({
      id: "page:/dashboard",
      type: "page",
      label: "Dashboard",
      href: "/dashboard"
    });
  });

  it("groups workspace pages by sidebar section", () => {
    const groups = buildWorkspacePageGroups("");
    expect(groups.map((group) => group.label)).toEqual(["Workspace", "My time", "Support"]);
    expect(groups[1]?.results.some((result) => result.href === "/overview")).toBe(true);
  });

  it("includes organization page groups for owners", () => {
    const groups = buildGlobalSearchPageGroups("", { includeAccount: true });
    expect(groups.some((group) => group.label === "Access")).toBe(true);
    expect(groups.some((group) => group.results.some((result) => result.label === "Summary"))).toBe(
      true
    );
  });
});
