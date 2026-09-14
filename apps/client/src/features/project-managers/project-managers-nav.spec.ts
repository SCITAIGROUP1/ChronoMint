import { describe, expect, it } from "vitest";
import { APP_NAV_ITEMS } from "@/config/app-nav";
import { projectLeadNavItems } from "@/config/project-manager-nav";

describe("project managers navigation", () => {
  it("exposes project managers in workspace management nav", () => {
    const item = APP_NAV_ITEMS.find((entry) => entry.href === "/project-managers");
    expect(item?.label).toBe("Project managers");
    expect(item?.keywords).toContain("pm");
  });

  it("hides project managers from project manager nav", () => {
    const leadHrefs = projectLeadNavItems().map((item) => item.href);
    expect(leadHrefs).not.toContain("/project-managers");
  });
});
