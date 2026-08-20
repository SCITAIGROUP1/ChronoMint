/** @vitest-environment jsdom */
import { getManagedRolePermissions, type UserProfileDto } from "@kloqra/contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountPreferencesSection } from "./account-preferences-section";

const profile: UserProfileDto = {
  email: "member@kloqra.dev",
  name: "Sam Rivera",
  firstName: "Sam",
  lastName: "Rivera",
  phone: null,
  location: null,
  jobTitle: null,
  department: null,
  workStartDate: null,
  defaultHourlyRate: null,
  twoFactorEnabled: false,
  preferences: { startupPage: "dashboard" },
  effectiveTheme: "system",
  effectiveTimezone: "UTC",
  effectiveDateFormat: "MDY",
  effectiveTimeFormat: "12h",
  effectiveDailyTargetHours: 8,
  effectiveTimerStaleWarningHours: 8,
  workContext: {
    organizationName: "Acme Corporation",
    workspaceName: "Acme Corporation",
    workspaceRole: "MEMBER"
  },
  activityStats: { totalHours: 0, projectCount: 0, memberSince: "2025-01-01T00:00:00.000Z" }
};

let session = {
  workspaceRole: "MEMBER" as const,
  capabilities: getManagedRolePermissions(["WORKSPACE_MEMBER"])
};

vi.mock("../../../../stores/session.store", () => ({
  useSessionStore: (selector: (state: { session: typeof session }) => unknown) =>
    selector({ session })
}));

vi.mock("../../../../stores/workspaces.store", () => ({
  useWorkspacesStore: (selector: (state: { workspaces: [] }) => unknown) =>
    selector({ workspaces: [] })
}));

describe("AccountPreferencesSection startup page", () => {
  it("offers Overview instead of Dashboard for a member, even if dashboard was saved", () => {
    session = {
      workspaceRole: "MEMBER",
      capabilities: getManagedRolePermissions(["WORKSPACE_MEMBER"])
    };

    render(<AccountPreferencesSection profile={profile} onSavePreferences={vi.fn()} />);

    fireEvent.click(screen.getByRole("combobox", { name: "Startup page" }));
    expect(screen.getByRole("option", { name: "Overview" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Dashboard" })).toBeNull();
  });
});
