/** @vitest-environment jsdom */
import type { CategoryDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  TIME_TRACKER_FILTERS_ROW_CLASS,
  TimeTrackerFiltersPanel
} from "./time-tracker-filters-panel";

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
  values: { categoryId: "", taskId: "", billability: "all" as const },
  projects,
  categories,
  tasks,
  projectId: [] as string[],
  onProjectChange: vi.fn(),
  onCategoryChange: vi.fn(),
  onTaskChange: vi.fn(),
  onBillabilityChange: vi.fn(),
  onClear: vi.fn(),
  memberFilter: [] as string[],
  onMemberChange: vi.fn(),
  members: [{ value: "u1", label: "Avery" }]
};

describe("TimeTrackerFiltersPanel", () => {
  afterEach(cleanup);

  it("keeps project, member, and extra filters in a popover", () => {
    render(<TimeTrackerFiltersPanel {...baseProps} />);

    expect(screen.getByRole("button", { name: "Filters" })).toBeTruthy();
    expect(screen.queryByLabelText("Project")).toBeNull();
    expect(screen.queryByLabelText("Member")).toBeNull();
    expect(screen.queryByLabelText("Category")).toBeNull();
    expect(screen.queryByText("Refine results")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));

    const panel = screen.getByTestId("time-tracker-filters-panel");
    expect(panel.className).toContain("max-h-[min(32rem,calc(100dvh-5rem))]");
    expect(screen.getByLabelText("Project")).toBeTruthy();
    expect(screen.getByLabelText("Member")).toBeTruthy();
    expect(screen.getByLabelText("Category")).toBeTruthy();
    expect(screen.getByLabelText("Task")).toBeTruthy();
    expect(screen.getByLabelText("Billability")).toBeTruthy();
    expect(screen.getByText("Optional — narrow this list")).toBeTruthy();
  });

  it("hides the member filter on personal time tracker", () => {
    render(<TimeTrackerFiltersPanel {...baseProps} hideMemberFilter />);

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));

    expect(screen.getByLabelText("Project")).toBeTruthy();
    expect(screen.queryByLabelText("Member")).toBeNull();
  });

  it("shows project and member chips without auto-expanding the popover", () => {
    render(
      <TimeTrackerFiltersPanel
        {...baseProps}
        projectId={["p1"]}
        memberFilter={["u1"]}
        values={{ categoryId: "c1", taskId: "", billability: "all" }}
      />
    );

    expect(screen.getByTestId("time-tracker-filter-chip-project").textContent).toContain("Alpha");
    expect(screen.getByTestId("time-tracker-filter-chip-member").textContent).toContain("Avery");
    expect(screen.getByTestId("time-tracker-filter-chip-category").textContent).toContain(
      "Development"
    );
    expect(screen.getByRole("button", { name: "Filters, 3 active" })).toBeTruthy();
    expect(screen.queryByLabelText("Project")).toBeNull();
  });

  it("keeps the trigger separate from applied chips so the toolbar does not reflow", () => {
    render(
      <div className={TIME_TRACKER_FILTERS_ROW_CLASS}>
        <div>Primary</div>
        <TimeTrackerFiltersPanel
          {...baseProps}
          projectId={["p1"]}
          values={{ categoryId: "c1", taskId: "t1", billability: "billable" }}
        />
      </div>
    );

    const trigger = screen.getByTestId("time-tracker-filters-trigger");
    const applied = screen.getByTestId("time-tracker-filters-applied");

    expect(trigger.contains(applied)).toBe(false);
    expect(applied.className).toContain("col-span-full");
    expect(screen.getByRole("button", { name: "Remove Project Alpha" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove Category Development" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove Task Build" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove Billability Billable only" })).toBeTruthy();
  });

  it("can hide applied chips so a parent toolbar can host them", () => {
    render(
      <TimeTrackerFiltersPanel
        {...baseProps}
        projectId={["p1"]}
        showAppliedChips={false}
        hideMemberFilter
        values={{ categoryId: "c1", taskId: "t1", billability: "billable" }}
      />
    );

    expect(screen.getByRole("button", { name: /Filters/ })).toBeTruthy();
    expect(screen.queryByTestId("time-tracker-filters-applied")).toBeNull();
  });
});
