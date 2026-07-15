import { describe, expect, it } from "vitest";
import {
  formatAdminWorkspaceAccessLabel,
  formatMemberPortalWorkspaceLabel,
  formatWorkspaceRole
} from "../auth/admin-access-label";
import { filterWorkspacesByQuery, resolveWorkspaceSwitchAction } from "./workspace-switcher";

const workspaces = [
  { id: "1", name: "Acme Corporation", role: "ADMIN" as const },
  { id: "2", name: "TechStart Inc", role: "MEMBER" as const },
  { id: "3", name: "Design Studio", role: "ADMIN" as const }
];

describe("formatWorkspaceRole", () => {
  it("maps workspace roles to display labels", () => {
    expect(formatWorkspaceRole("ADMIN")).toBe("Workspace admin");
    expect(formatWorkspaceRole("MEMBER")).toBe("Member");
  });
});

describe("formatMemberPortalWorkspaceLabel", () => {
  it("always shows Member regardless of elevated access", () => {
    expect(formatMemberPortalWorkspaceLabel()).toBe("Member");
  });
});

describe("formatAdminWorkspaceAccessLabel", () => {
  it("labels project managers as project managers in admin chrome", () => {
    expect(formatAdminWorkspaceAccessLabel("MEMBER", ["project-1"])).toBe("Project manager");
    expect(formatAdminWorkspaceAccessLabel("ADMIN")).toBe("Workspace admin");
    expect(formatAdminWorkspaceAccessLabel("ADMIN", undefined, "ADMIN")).toBe("Organization admin");
  });

  it("shows owner hat alongside workspace access when tenant is owner", () => {
    expect(formatAdminWorkspaceAccessLabel("ADMIN", undefined, "OWNER")).toBe(
      "Owner · Workspace admin"
    );
    expect(formatAdminWorkspaceAccessLabel("MEMBER", ["project-1"], "OWNER")).toBe(
      "Owner · Project manager"
    );
  });
});

describe("filterWorkspacesByQuery", () => {
  it("returns all workspaces when query is empty", () => {
    expect(filterWorkspacesByQuery(workspaces, "")).toEqual(workspaces);
    expect(filterWorkspacesByQuery(workspaces, "   ")).toEqual(workspaces);
  });

  it("filters workspaces by name", () => {
    expect(filterWorkspacesByQuery(workspaces, "tech")).toEqual([workspaces[1]]);
    expect(filterWorkspacesByQuery(workspaces, "design")).toEqual([workspaces[2]]);
  });
});

describe("resolveWorkspaceSwitchAction", () => {
  it("navigates into workspace when picking current id from account context", () => {
    expect(
      resolveWorkspaceSwitchAction({
        nextId: "ws-1",
        currentId: "ws-1",
        isAccountContext: true
      })
    ).toBe("enter-workspace");
  });

  it("noops when picking current id outside account context", () => {
    expect(
      resolveWorkspaceSwitchAction({
        nextId: "ws-1",
        currentId: "ws-1",
        isAccountContext: false
      })
    ).toBe("noop");
  });

  it("switches when picking a different workspace", () => {
    expect(
      resolveWorkspaceSwitchAction({
        nextId: "ws-2",
        currentId: "ws-1",
        isAccountContext: true
      })
    ).toBe("switch");
  });
});
