import { describe, expect, it } from "vitest";
import { ACCOUNT_NAV_ITEMS } from "./account-nav";
import { APP_NAV_ITEMS } from "./app-nav";
import { projectLeadNavItems } from "./project-manager-nav";

describe("app navigation scopes", () => {
  it("uses unique labels across account and workspace nav pools", () => {
    const labels = [...ACCOUNT_NAV_ITEMS, ...APP_NAV_ITEMS].map((item) => item.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("uses unique hrefs across account and workspace nav pools", () => {
    const hrefs = [...ACCOUNT_NAV_ITEMS, ...APP_NAV_ITEMS].map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("keeps project manager nav as a strict workspace subset", () => {
    const leadHrefs = projectLeadNavItems().map((item) => item.href);
    const adminHrefs = APP_NAV_ITEMS.map((item) => item.href);
    for (const href of leadHrefs) {
      expect(adminHrefs).toContain(href);
    }
    expect(leadHrefs).not.toContain("/team-management");
    expect(leadHrefs).not.toContain("/project-managers");
    expect(leadHrefs).not.toContain("/billing");
    expect(leadHrefs).not.toContain("/workspace");
  });

  it("does not duplicate overview labels between account and workspace nav", () => {
    const accountSummary = ACCOUNT_NAV_ITEMS.find((item) => item.href === "/account");
    const personalOverview = APP_NAV_ITEMS.find((item) => item.href === "/overview");
    const workspaceDashboard = APP_NAV_ITEMS.find((item) => item.href === "/dashboard");
    expect(accountSummary?.label).toBe("Summary");
    expect(personalOverview?.label).toBe("Overview");
    expect(workspaceDashboard?.label).toBe("Dashboard");
  });
});
