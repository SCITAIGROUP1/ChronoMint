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
});
