/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApprovalsFiltersBar } from "./approvals-filters-bar";

describe("ApprovalsFiltersBar", () => {
  afterEach(cleanup);

  it("keeps filter fields in a popover instead of a dialog", () => {
    render(
      <ApprovalsFiltersBar
        filters={{}}
        onChange={() => {}}
        onClear={() => {}}
        projectOptions={[{ value: "p1", label: "Alpha" }]}
        memberOptions={[{ value: "u1", label: "Sam" }]}
      />
    );

    expect(screen.getByRole("button", { name: "Filters" })).toBeTruthy();
    expect(screen.queryByLabelText("Project")).toBeNull();
    expect(screen.queryByRole("dialog", { name: "Filters" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));

    const panel = screen.getByTestId("approvals-filters-panel");
    expect(panel.className).toContain("max-h-[min(32rem,calc(100dvh-5rem))]");
    expect(screen.getByLabelText("Project")).toBeTruthy();
    expect(screen.getByLabelText("Member")).toBeTruthy();
    expect(screen.getByText("Optional — narrow this list")).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Filters" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
  });

  it("shows active chips without auto-expanding the popover", () => {
    render(
      <ApprovalsFiltersBar
        filters={{ projectId: ["p1"], userId: ["u1"] }}
        onChange={() => {}}
        onClear={vi.fn()}
        projectOptions={[{ value: "p1", label: "Alpha" }]}
        memberOptions={[{ value: "u1", label: "Sam" }]}
      />
    );

    expect(screen.getByTestId("approvals-filter-chip-project").textContent).toContain("Alpha");
    expect(screen.getByTestId("approvals-filter-chip-member").textContent).toContain("Sam");
    expect(screen.getByRole("button", { name: "Filters, 2 active" })).toBeTruthy();
    expect(screen.queryByLabelText("Project")).toBeNull();
  });
});
