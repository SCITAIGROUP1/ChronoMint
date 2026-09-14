// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TenantSupportPage from "./page";

vi.mock("@kloqra/web-shared", () => ({
  getApiBase: () => "http://localhost:3001",
  SupportTicketForm: () => <div>Support form fields</div>
}));

vi.mock("@/stores/session.store", () => ({
  useSessionStore: (selector: (state: unknown) => unknown) =>
    selector({
      session: {
        tenantId: "tenant",
        user: { name: "Member", email: "member@example.com" }
      }
    })
}));

describe("TenantSupportPage", () => {
  afterEach(cleanup);

  it("uses standard stat cards and a full-width request form", () => {
    render(<TenantSupportPage />);

    expect(screen.getByText("15 min")).toBeTruthy();
    expect(screen.getByText("8 hours")).toBeTruthy();
    const formRegion = screen.getByRole("region", { name: "Support request form" });
    expect(formRegion.className).toContain("w-full");
    expect(formRegion.className).not.toContain("max-w-3xl");
    expect(screen.getByText("Support form fields")).toBeTruthy();
  });
});
