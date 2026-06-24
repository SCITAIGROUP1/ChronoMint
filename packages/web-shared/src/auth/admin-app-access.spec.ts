import { describe, expect, it } from "vitest";
import { canAccessAdminApp, canLoginToAdminApp } from "./admin-app-access";

describe("canAccessAdminApp", () => {
  it("allows workspace admin", () => {
    expect(canAccessAdminApp("ADMIN", undefined)).toBe(true);
  });

  it("allows member with led projects", () => {
    expect(canAccessAdminApp("MEMBER", ["proj-1"])).toBe(true);
  });

  it("denies plain member", () => {
    expect(canAccessAdminApp("MEMBER", [])).toBe(false);
    expect(canAccessAdminApp("MEMBER", undefined)).toBe(false);
  });
});

describe("canLoginToAdminApp", () => {
  it("allows workspace admin", () => {
    expect(canLoginToAdminApp({ workspaceRole: "ADMIN", tenantRole: undefined })).toBe(true);
  });

  it("allows project lead without workspace admin", () => {
    expect(
      canLoginToAdminApp({ workspaceRole: "MEMBER", tenantRole: undefined, ledProjectIds: ["p1"] })
    ).toBe(true);
  });

  it("allows organization owner without workspace admin", () => {
    expect(
      canLoginToAdminApp({ workspaceRole: "MEMBER", tenantRole: "OWNER", ledProjectIds: [] })
    ).toBe(true);
  });

  it("allows organization admin without workspace admin", () => {
    expect(
      canLoginToAdminApp({ workspaceRole: "MEMBER", tenantRole: "ADMIN", ledProjectIds: [] })
    ).toBe(true);
  });

  it("denies plain workspace member", () => {
    expect(canLoginToAdminApp({ workspaceRole: "MEMBER", tenantRole: undefined })).toBe(false);
  });
});
