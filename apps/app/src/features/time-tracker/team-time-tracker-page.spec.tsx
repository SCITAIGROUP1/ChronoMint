// @vitest-environment jsdom
import { type AuthSessionDto, getManagedRolePermissions } from "@kloqra/contracts";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeamTimeTrackerPage } from "./team-time-tracker-page";

let session: AuthSessionDto | null;
const adminProps = vi.fn();

vi.mock("@/stores/session.store", () => ({
  useSessionStore: (selector: (state: { session: AuthSessionDto | null }) => unknown) =>
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

vi.mock("./time-tracker-page", () => ({
  AdminTimeTrackerPage: (props: Record<string, unknown>) => {
    adminProps(props);
    return <div>Team time tracker grid</div>;
  }
}));

const BASE_SESSION: AuthSessionDto = {
  user: { id: "00000000-0000-4000-8000-000000000001", name: "Member" },
  tenantId: "00000000-0000-4000-8000-000000000002",
  workspaceId: "00000000-0000-4000-8000-000000000003",
  workspaceName: "Workspace",
  workspaceRole: "MEMBER"
};

describe("TeamTimeTrackerPage", () => {
  beforeEach(() => {
    adminProps.mockClear();
  });

  afterEach(cleanup);

  it("renders the admin team tracker for workspace report access", () => {
    session = {
      ...BASE_SESSION,
      workspaceRole: "ADMIN",
      capabilities: getManagedRolePermissions(["WORKSPACE_ADMIN"])
    };

    render(<TeamTimeTrackerPage />);

    expect(screen.getByText("Team time tracker grid")).toBeTruthy();
    expect(adminProps).toHaveBeenCalledWith(
      expect.objectContaining({ managedProjectIds: undefined })
    );
  });

  it("scopes project managers to managed projects", () => {
    session = {
      ...BASE_SESSION,
      managedProjectIds: ["project-1"],
      capabilities: getManagedRolePermissions(["WORKSPACE_MEMBER", "PROJECT_MANAGER"])
    };

    render(<TeamTimeTrackerPage />);

    expect(adminProps).toHaveBeenCalledWith(
      expect.objectContaining({ managedProjectIds: ["project-1"] })
    );
  });

  it("points members without report access to personal Time Tracker", () => {
    session = {
      ...BASE_SESSION,
      capabilities: getManagedRolePermissions(["WORKSPACE_MEMBER"])
    };

    render(<TeamTimeTrackerPage />);

    expect(screen.getByText("No team time reporting here")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Go to Time Tracker" }).getAttribute("href")).toBe(
      "/time-tracker"
    );
    expect(adminProps).not.toHaveBeenCalled();
  });
});
