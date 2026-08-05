/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingOverlay } from "./onboarding-overlay";

const sessionState: { session: Record<string, unknown> | null } = { session: null };
const api = vi.fn();

vi.mock("@/stores/session.store", () => ({
  useSessionStore: (selector: (state: typeof sessionState) => unknown) => selector(sessionState)
}));
vi.mock("@/hooks/use-is-impersonating", () => ({ useIsImpersonating: () => false }));
vi.mock("./use-onboarding-status", () => ({
  useOnboardingStatus: () => ({
    profileLoading: false,
    wizardDone: false,
    markWizardDone: vi.fn()
  })
}));
vi.mock("@/lib/api", () => ({ api }));

function session(capabilities: string[]) {
  return {
    user: { id: "user-1", name: "Sam" },
    workspaceId: "workspace-1",
    workspaceRole: "MEMBER",
    capabilities
  };
}

describe("OnboardingOverlay project step", () => {
  beforeEach(() => {
    api.mockClear();
  });
  afterEach(cleanup);

  it("offers the existing project creation flow only with CreateProject capability", () => {
    sessionState.session = session(["workspace:CreateProject"]);
    render(<OnboardingOverlay forceOpen />);

    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(
      screen.getByRole("link", { name: "Create your first project" }).getAttribute("href")
    ).toBe("/projects?create=1");
    expect(api).not.toHaveBeenCalled();
  });

  it("shows members how to join projects and never offers project creation", () => {
    sessionState.session = session(["personal:ManageTimelogs"]);
    render(<OnboardingOverlay forceOpen />);

    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByText(/ask a workspace manager to add you/i)).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Create your first project" })).toBeNull();
    expect(api).not.toHaveBeenCalled();
  });

  it("does not open product onboarding without a workspace context", () => {
    sessionState.session = {
      user: { id: "user-2", name: "Second Admin" },
      tenantId: "tenant-1",
      tenantRole: "ADMIN",
      organizationOnly: true,
      capabilities: ["tenant:ManageMembers"]
    };

    render(<OnboardingOverlay />);

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
