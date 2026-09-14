import type { CategoryDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReportScopeFilters } from "./report-scope-filters";

const projects = [
  {
    id: "p1",
    workspaceId: "ws-1",
    name: "Alpha",
    color: "#111111",
    isActive: true,
    clientName: null,
    budgetHours: null,
    timesheetApprovalPeriod: null
  }
] as ProjectDto[];

const categories = [
  {
    id: "c1",
    workspaceId: "ws-1",
    name: "Dev",
    description: null,
    isActive: true
  }
] as CategoryDto[];

const tasks = [
  {
    id: "t1",
    projectId: "p1",
    categoryId: "c1",
    categoryName: "Dev",
    taskName: "Build",
    billableDefault: true,
    isCommon: true,
    isActive: true,
    assignees: []
  }
] as TaskDto[];

const baseProps = {
  values: {
    projectId: [] as string[],
    categoryId: [] as string[],
    taskId: "",
    userId: [] as string[]
  },
  projects,
  categories,
  tasks,
  members: [{ userId: "u1", userName: "Avery" }],
  onProjectChange: vi.fn(),
  onCategoryChange: vi.fn(),
  onTaskChange: vi.fn(),
  onUserChange: vi.fn(),
  onClearAll: vi.fn()
};

describe("ReportScopeFilters", () => {
  it("keeps filter fields in a popover instead of expanding inline", () => {
    render(<ReportScopeFilters {...baseProps} compact />);

    expect(screen.getByRole("button", { name: "Scope filters" })).toBeTruthy();
    expect(screen.queryByLabelText("Project")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Scope filters" }));

    expect(screen.getByLabelText("Project")).toBeTruthy();
    expect(screen.getByLabelText("Category")).toBeTruthy();
    expect(screen.getByText("Optional — narrow charts and exports")).toBeTruthy();
    expect(screen.queryByLabelText("Non-project time")).toBeNull();
  });

  it("shows active chips without auto-expanding the popover", () => {
    render(
      <ReportScopeFilters
        {...baseProps}
        compact
        values={{
          projectId: ["p1"],
          categoryId: [],
          taskId: "",
          userId: []
        }}
      />
    );

    expect(screen.getByText("Project: Alpha")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Scope filters, 1 active" })).toBeTruthy();
    expect(screen.queryByLabelText("Project")).toBeNull();
  });

  it("places non-project time in the popover with include, exclude, and only", () => {
    const onNonProjectTimeChange = vi.fn();
    render(
      <ReportScopeFilters
        {...baseProps}
        compact
        nonProjectTime="exclude"
        defaultNonProjectTime="exclude"
        onNonProjectTimeChange={onNonProjectTimeChange}
      />
    );

    expect(screen.getByRole("button", { name: "Scope filters" })).toBeTruthy();
    expect(screen.queryByTestId("non-project-time-filter")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Scope filters" }));

    expect(screen.getByTestId("non-project-time-filter")).toHaveTextContent(/exclude/i);
    fireEvent.click(screen.getByRole("combobox", { name: "Non-project time" }));

    fireEvent.click(screen.getByRole("option", { name: "Include" }));
    expect(onNonProjectTimeChange).toHaveBeenCalledWith("include");

    fireEvent.click(screen.getByRole("combobox", { name: "Non-project time" }));
    fireEvent.click(screen.getByRole("option", { name: "Exclude" }));
    expect(onNonProjectTimeChange).toHaveBeenCalledWith("exclude");

    fireEvent.click(screen.getByRole("combobox", { name: "Non-project time" }));
    fireEvent.click(screen.getByRole("option", { name: "Only non-project" }));
    expect(onNonProjectTimeChange).toHaveBeenCalledWith("only");
  });

  it("treats a non-default non-project mode as an active chip", () => {
    const onNonProjectTimeChange = vi.fn();
    render(
      <ReportScopeFilters
        {...baseProps}
        compact
        nonProjectTime="only"
        defaultNonProjectTime="exclude"
        onNonProjectTimeChange={onNonProjectTimeChange}
      />
    );

    expect(screen.getByText("Non-project: Only non-project")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Scope filters, 1 active" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Remove Non-project: Only non-project" }));
    expect(onNonProjectTimeChange).toHaveBeenCalledWith("exclude");
  });

  it("filters non-project options by search", () => {
    render(
      <ReportScopeFilters
        {...baseProps}
        compact
        nonProjectTime="exclude"
        defaultNonProjectTime="exclude"
        onNonProjectTimeChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Scope filters" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Non-project time" }));
    fireEvent.change(screen.getByPlaceholderText("Search include, exclude, only…"), {
      target: { value: "only" }
    });

    expect(screen.queryByRole("option", { name: "Include" })).toBeNull();
    expect(screen.getByRole("option", { name: "Only non-project" })).toBeTruthy();
  });

  it("hides project filters when only non-project time is selected", () => {
    render(
      <ReportScopeFilters
        {...baseProps}
        compact
        values={{
          projectId: ["p1"],
          categoryId: [],
          taskId: "",
          userId: []
        }}
        nonProjectTime="only"
        defaultNonProjectTime="exclude"
        onNonProjectTimeChange={vi.fn()}
      />
    );

    expect(screen.queryByText("Project: Alpha")).toBeNull();
    expect(screen.getByText("Non-project: Only non-project")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Scope filters, 1 active" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Scope filters, 1 active" }));
    expect(screen.queryByLabelText("Project")).toBeNull();
    expect(screen.queryByLabelText("Task")).toBeNull();
    expect(screen.getByLabelText("Non-project time")).toBeTruthy();
  });
});
