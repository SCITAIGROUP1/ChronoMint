import { render, screen } from "@testing-library/react";
import { Sparkles } from "lucide-react";
import { describe, expect, it } from "vitest";
import { AppModal } from "./app-modal.js";

describe("AppModal", () => {
  it("renders title, description, and body", () => {
    render(
      <AppModal
        open
        title="Create project"
        description="Add a project to organize work."
        icon={<Sparkles className="size-5" />}
        footer={<button type="button">Save</button>}
      >
        <p>Form content</p>
      </AppModal>
    );

    expect(screen.getByRole("heading", { name: "Create project" })).toBeInTheDocument();
    expect(screen.getByText("Add a project to organize work.")).toBeInTheDocument();
    expect(screen.getByText("Form content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("does not reference a missing description", () => {
    render(
      <AppModal open title="Quick entry">
        <p>Form content</p>
      </AppModal>
    );

    expect(screen.getByRole("dialog")).not.toHaveAttribute("aria-describedby");
  });

  it("renders a header action to the right of the title", () => {
    render(
      <AppModal open title="Log time" headerAction={<button type="button">Sep 14, 2026</button>}>
        <p>Form content</p>
      </AppModal>
    );

    expect(screen.getByRole("heading", { name: "Log time" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sep 14, 2026" })).toBeInTheDocument();
  });

  it("aligns icon, title, header action, and close in one header row", () => {
    render(
      <AppModal
        open
        title="Log time"
        icon={<Sparkles className="size-5" />}
        headerAction={<button type="button">Sep 14, 2026</button>}
      >
        <p>Form content</p>
      </AppModal>
    );

    const row = screen.getByTestId("modal-header-row");
    const leading = screen.getByTestId("modal-header-leading");
    const trailing = screen.getByTestId("modal-header-trailing");
    expect(row.className).toContain("justify-between");
    expect(leading).toContainElement(screen.getByRole("heading", { name: "Log time" }));
    expect(trailing).toContainElement(screen.getByRole("button", { name: "Sep 14, 2026" }));
    expect(trailing).toContainElement(screen.getByRole("button", { name: "Close" }));
  });
});
