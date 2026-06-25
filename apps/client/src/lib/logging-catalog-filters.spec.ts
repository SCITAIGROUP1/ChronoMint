import type { CategoryDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import {
  filterLoggingProjects,
  filterLoggingTasks,
  isLoggableTask
} from "./logging-catalog-filters";

const project = {
  id: "p1",
  workspaceId: "w1",
  name: "Alpha",
  color: "#236bfe",
  clientName: null,
  budgetHours: null,
  isActive: true,
  timesheetApprovalPeriod: null,
  timesheetApprovalEnabled: false
} satisfies ProjectDto;

const inactiveProject = { ...project, id: "p2", isActive: false } satisfies ProjectDto;

const category = {
  id: "c1",
  workspaceId: "w1",
  name: "Dev",
  description: null,
  isActive: true
} satisfies CategoryDto;

const inactiveCategory = { ...category, id: "c2", isActive: false } satisfies CategoryDto;

const task = {
  id: "t1",
  projectId: "p1",
  categoryId: "c1",
  categoryName: "Dev",
  taskName: "Design",
  billableDefault: true,
  isCommon: true,
  isActive: true,
  assignees: []
} satisfies TaskDto;

describe("logging catalog filters", () => {
  it("keeps only active projects", () => {
    expect(filterLoggingProjects([project, inactiveProject])).toEqual([project]);
  });

  it("excludes tasks on inactive projects, categories, or tasks", () => {
    const projectById = new Map<string, ProjectDto>([
      [project.id, project],
      [inactiveProject.id, inactiveProject]
    ]);
    const categoryById = new Map<string, CategoryDto>([
      [category.id, category],
      [inactiveCategory.id, inactiveCategory]
    ]);

    expect(isLoggableTask(task, projectById, categoryById)).toBe(true);
    expect(isLoggableTask({ ...task, isActive: false }, projectById, categoryById)).toBe(false);
    expect(isLoggableTask({ ...task, projectId: "p2" }, projectById, categoryById)).toBe(false);
    expect(isLoggableTask({ ...task, categoryId: "c2" }, projectById, categoryById)).toBe(false);
  });

  it("filters task lists for logging selectors", () => {
    const tasks = [
      task,
      { ...task, id: "t2", isActive: false },
      { ...task, id: "t3", projectId: "p2" },
      { ...task, id: "t4", categoryId: "c2" }
    ];
    expect(
      filterLoggingTasks(tasks, [project, inactiveProject], [category, inactiveCategory])
    ).toEqual([task]);
  });
});
