// @vitest-environment jsdom
import { type AuthSessionDto } from "@kloqra/contracts";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PersonalOverviewPage } from "./personal-overview-page";

let session: AuthSessionDto | null;
const managementProps = vi.fn();

vi.mock("@/stores/session.store", () => ({
  useSessionStore: (selector: (state: { session: AuthSessionDto | null }) => unknown) =>
    selector({ session })
}));

vi.mock("@/features/dashboard/management-dashboard-lazy", () => ({
  ManagementDashboardLazy: (props: Record<string, unknown>) => {
    managementProps(props);
    return <div>Personal widget grid</div>;
  }
}));

const BASE_SESSION: AuthSessionDto = {
  user: { id: "00000000-0000-4000-8000-000000000001", name: "Member" },
  tenantId: "00000000-0000-4000-8000-000000000002",
  workspaceId: "00000000-0000-4000-8000-000000000003",
  workspaceName: "Workspace",
  workspaceRole: "MEMBER"
};

describe("PersonalOverviewPage", () => {
  beforeEach(() => {
    managementProps.mockClear();
  });

  afterEach(cleanup);

  it("renders personal widgets only under Overview", () => {
    session = {
      ...BASE_SESSION,
      capabilities: [
        "workspace:Access",
        "personal:ManageTimer",
        "personal:ManageTimelogs",
        "personal:SubmitTimesheets",
        "personal:ListProjects",
        "workspace:ReadReports"
      ]
    };

    render(<PersonalOverviewPage />);

    expect(screen.getAllByRole("heading", { level: 1, name: "Overview" })).toHaveLength(1);
    expect(screen.getByText("Personal widget grid")).toBeTruthy();
    expect(managementProps).toHaveBeenCalledWith(
      expect.objectContaining({
        showPersonal: true,
        showManagement: false
      })
    );
  });

  it("explains when personal time features are unavailable", () => {
    session = {
      ...BASE_SESSION,
      capabilities: ["workspace:Access", "workspace:ReadReports"]
    };

    render(<PersonalOverviewPage />);

    expect(
      screen.getByText("You don't have access to personal time features in this workspace.")
    ).toBeTruthy();
    expect(managementProps).not.toHaveBeenCalled();
  });
});
