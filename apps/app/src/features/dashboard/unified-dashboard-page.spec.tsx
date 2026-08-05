// @vitest-environment jsdom
import { type AuthSessionDto } from "@kloqra/contracts";
import { cleanup, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UnifiedDashboardPage } from "./unified-dashboard-page";
let session: AuthSessionDto;
const managementDataCall = vi.fn();
const managementProps = vi.fn();

vi.mock("@/stores/session.store", () => ({
  useSessionStore: (selector: (state: { session: AuthSessionDto }) => unknown) =>
    selector({ session })
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock("./management-dashboard-lazy", () => ({
  ManagementDashboardLazy: (
    props: { onAppBarDescriptionChange?: (description: string | null) => void } & Record<
      string,
      unknown
    >
  ) => {
    const onAppBarDescriptionChange = props.onAppBarDescriptionChange;
    useEffect(() => {
      managementDataCall();
      onAppBarDescriptionChange?.("All workspace · Jul 20 – Jul 26");
    }, [onAppBarDescriptionChange]);
    managementProps(props);
    return <div>Combined widget grid</div>;
  }
}));

const BASE_SESSION: AuthSessionDto = {
  user: { id: "00000000-0000-4000-8000-000000000001", name: "Member" },
  tenantId: "00000000-0000-4000-8000-000000000002",
  workspaceId: "00000000-0000-4000-8000-000000000003",
  workspaceName: "Workspace",
  workspaceRole: "MEMBER"
};

describe("UnifiedDashboardPage", () => {
  beforeEach(() => {
    managementDataCall.mockClear();
    managementProps.mockClear();
  });

  afterEach(cleanup);

  it("shows an Overview CTA instead of personal widgets for a member", () => {
    session = {
      ...BASE_SESSION,
      capabilities: [
        "workspace:Access",
        "personal:ManageTimer",
        "personal:ManageTimelogs",
        "personal:SubmitTimesheets",
        "personal:ListProjects"
      ]
    };

    render(<UnifiedDashboardPage />);

    expect(screen.getByText("No workspace analytics here")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Go to Overview" }).getAttribute("href")).toBe(
      "/overview"
    );
    expect(screen.queryByText("Combined widget grid")).toBeNull();
    expect(managementDataCall).not.toHaveBeenCalled();
  });

  it("loads management analytics only for an admin capability snapshot", () => {
    session = {
      ...BASE_SESSION,
      workspaceRole: "ADMIN",
      capabilities: [
        "personal:ManageTimelogs",
        "workspace:ReadReports",
        "workspace:ManageBillingRates",
        "workspace:ReadPresence",
        "project:ReviewTimesheets"
      ]
    };

    render(<UnifiedDashboardPage />);

    expect(screen.getAllByRole("heading", { level: 1, name: "Dashboard" })).toHaveLength(1);
    expect(screen.getByText("All workspace · Jul 20 – Jul 26")).toBeTruthy();
    expect(screen.getByText("Combined widget grid")).toBeTruthy();
    expect(managementDataCall).toHaveBeenCalledOnce();
    expect(managementProps).toHaveBeenCalledWith(
      expect.objectContaining({
        showPersonal: false,
        showManagement: true,
        workspaceWide: true,
        projectIds: []
      })
    );
  });

  it("passes an immutable managed-project scope to project management analytics", () => {
    const projectIds = [
      "00000000-0000-4000-8000-000000000004",
      "00000000-0000-4000-8000-000000000005"
    ];
    session = {
      ...BASE_SESSION,
      managedProjectIds: projectIds,
      capabilities: [
        "personal:ManageTimelogs",
        "project:ReadReports",
        "project:ReadPresence",
        "project:ReviewTimesheets"
      ]
    };

    render(<UnifiedDashboardPage />);

    expect(managementProps).toHaveBeenCalledWith(
      expect.objectContaining({
        showPersonal: false,
        showManagement: true,
        workspaceWide: false,
        projectIds
      })
    );
  });
});
