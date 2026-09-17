/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApprovalsFiltersBar } from "./approvals-filters-bar";

describe("ApprovalsFiltersBar", () => {
  it("opens a compact filter sheet", () => {
    render(
      <ApprovalsFiltersBar
        filters={{}}
        onChange={() => {}}
        onClear={() => {}}
        projectOptions={[{ value: "p1", label: "Alpha" }]}
        memberOptions={[{ value: "u1", label: "Sam" }]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeTruthy();
    expect(screen.getAllByText("Project").length).toBeGreaterThan(0);
  });
});
