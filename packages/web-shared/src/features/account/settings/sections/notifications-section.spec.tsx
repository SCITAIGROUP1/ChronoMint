import { describe, expect, it } from "vitest";
import {
  buildNotificationPreferenceGroups,
  NOTIFICATION_PREFERENCE_SECTION_LABELS
} from "./notifications-section";

describe("buildNotificationPreferenceGroups", () => {
  it("groups member prefs under My time only", () => {
    const groups = buildNotificationPreferenceGroups("member");
    expect(groups.map((g) => g.label)).toEqual([NOTIFICATION_PREFERENCE_SECTION_LABELS["my-time"]]);
    expect(groups[0]?.rows.every((row) => row.section === "my-time")).toBe(true);
    expect(groups[0]?.rows.some((row) => row.key === "timesheetStatus")).toBe(true);
    expect(groups.some((g) => g.section === "workspace")).toBe(false);
  });

  it("groups admin prefs under Workspace only", () => {
    const groups = buildNotificationPreferenceGroups("admin", { hideBudget: false });
    expect(groups.map((g) => g.label)).toEqual([NOTIFICATION_PREFERENCE_SECTION_LABELS.workspace]);
    expect(groups[0]?.rows.every((row) => row.section === "workspace")).toBe(true);
    expect(groups[0]?.rows.some((row) => row.key === "approvalRequest")).toBe(true);
  });

  it("separates Workspace admin prefs from My time member prefs for workspace admins", () => {
    const groups = buildNotificationPreferenceGroups("workspace-admin", { hideBudget: true });
    expect(groups.map((g) => g.section)).toEqual(["workspace", "my-time"]);
    expect(groups.map((g) => g.label)).toEqual(["Workspace", "My time"]);

    const workspaceKeys = groups[0]?.rows.map((row) => row.key) ?? [];
    const myTimeKeys = groups[1]?.rows.map((row) => row.key) ?? [];

    expect(workspaceKeys).toContain("approvalRequest");
    expect(workspaceKeys).toContain("memberChanges");
    expect(workspaceKeys).not.toContain("budgetAlert");
    expect(workspaceKeys).not.toContain("taskAssignment");

    expect(myTimeKeys).toContain("taskAssignment");
    expect(myTimeKeys).toContain("timesheetReminders");
    expect(myTimeKeys).not.toContain("approvalRequest");
  });

  it("keeps project-manager admin alerts in Workspace and personal alerts in My time", () => {
    const groups = buildNotificationPreferenceGroups("project-manager", { hideBudget: false });
    expect(groups.map((g) => g.section)).toEqual(["workspace", "my-time"]);

    const workspaceKeys = groups[0]?.rows.map((row) => row.key) ?? [];
    expect(workspaceKeys).toEqual(
      expect.arrayContaining(["approvalRequest", "budgetAlert", "missingTimesheets"])
    );
    expect(workspaceKeys).toHaveLength(3);
    expect(groups[1]?.rows.some((row) => row.key === "projectAssignment")).toBe(true);
  });

  it("scopes org-mode rows to org admin Workspace prefs plus personal My time prefs", () => {
    const groups = buildNotificationPreferenceGroups("tenant-admin-org");
    expect(groups.map((g) => g.section)).toEqual(["workspace", "my-time"]);

    expect(groups[0]?.rows.map((row) => row.key)).toEqual(
      expect.arrayContaining(["memberChanges", "workspaceCreated", "exportSchedule"])
    );
    expect(groups[0]?.rows).toHaveLength(3);
    expect(groups[1]?.rows.map((row) => row.key)).toEqual(
      expect.arrayContaining(["workspaceAdded", "roleChanges"])
    );
    expect(groups[1]?.rows).toHaveLength(2);
  });
});
