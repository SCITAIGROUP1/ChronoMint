/** @vitest-environment jsdom */
import type { CategoryDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TimeTrackerToolbar } from "./time-tracker-toolbar";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);
HTMLElement.prototype.scrollIntoView = () => {};

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
    name: "Development",
    description: null,
    isActive: true
  }
] as CategoryDto[];

const tasks = [
  {
    id: "t1",
    projectId: "p1",
    categoryId: "c1",
    categoryName: "Development",
    taskName: "Build",
    billableDefault: true,
    isCommon: true,
    isActive: true,
    assignees: []
  }
] as TaskDto[];

const baseProps = {
  search: "",
  onSearchChange: vi.fn(),
  projectId: [] as string[],
  onProjectChange: vi.fn(),
  period: "this_week" as const,
  onPeriodChange: vi.fn(),
  rangeFrom: "2026-09-14",
  rangeTo: "2026-09-20",
  onRangeChange: vi.fn(),
  projects,
  categories,
  tasks,
  workspaceNamesById: {},
  filterValues: { categoryId: "", taskId: "", billability: "all" as const },
  onCategoryChange: vi.fn(),
  onTaskChange: vi.fn(),
  onBillabilityChange: vi.fn(),
  onClearFilters: vi.fn(),
  memberFilter: [] as string[],
  onMemberChange: vi.fn(),
  members: [{ value: "u1", label: "Avery" }]
};

describe("TimeTrackerToolbar", () => {
  afterEach(cleanup);

  it("keeps period navigation leading and filters trailing like timesheet", () => {
    render(
      <TimeTrackerToolbar
        {...baseProps}
        extraActions={<button type="button">Export</button>}
        analyticsVisible={false}
        onToggleAnalytics={vi.fn()}
        hideMemberFilter
      />
    );

    expect(screen.getByTestId("app-bar-secondary")).toBeTruthy();
    const leading = screen.getByTestId("time-tracker-toolbar-leading");
    const trailing = screen.getByTestId("app-bar-secondary-actions");
    expect(leading.contains(screen.getByRole("combobox", { name: "Time period" }))).toBe(true);
    expect(leading.contains(screen.getByRole("textbox", { name: "Search entries" }))).toBe(true);
    expect(trailing.contains(screen.getByRole("button", { name: "Show analytics" }))).toBe(true);
    expect(trailing.contains(screen.getByRole("button", { name: "Filters" }))).toBe(true);
    const extraAction =
      screen.queryByRole("button", { name: "More actions" }) ??
      screen.getByRole("button", { name: "Export" });
    expect(trailing.contains(extraAction)).toBe(true);
    expect(screen.queryByRole("combobox", { name: "Entry type" })).toBeNull();
  });

  it("renders applied chips below the app-bar row so the toolbar does not reflow", () => {
    render(
      <TimeTrackerToolbar
        {...baseProps}
        projectId={["p1"]}
        filterValues={{ categoryId: "c1", taskId: "t1", billability: "billable" }}
        hideMemberFilter
      />
    );

    const toolbar = screen.getByTestId("time-tracker-toolbar");
    const applied = screen.getByTestId("time-tracker-filters-applied");
    const trigger = screen.getByTestId("time-tracker-filters-trigger");

    expect(toolbar.contains(applied)).toBe(true);
    expect(trigger.contains(applied)).toBe(false);
    expect(screen.getByRole("button", { name: "Remove Project Alpha" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Filters, 4 active" }));
    expect(screen.getByTestId("time-tracker-filters-panel")).toBeTruthy();
  });
});
