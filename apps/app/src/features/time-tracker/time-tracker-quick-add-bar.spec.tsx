/** @vitest-environment jsdom */
import type { CategoryDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TimeTrackerQuickAddBar } from "./time-tracker-quick-add-bar";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);
HTMLElement.prototype.scrollIntoView = () => {};

const toggleProject = vi.fn();
const toggleTask = vi.fn();

vi.mock("@kloqra/web-shared", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useSessionStore: (selector: (state: { session: unknown }) => unknown) =>
      selector({
        session: { user: { id: "user-1" }, workspaceId: "ws-1" }
      }),
    useEntryFavorites: () => ({
      favorites: {
        version: 2,
        projects: ["proj-b"],
        tasks: [{ projectId: "proj-1", taskId: "task-fav", taskName: "Favorite Task" }]
      },
      favoriteProjectIds: ["proj-b"],
      favoriteTaskIds: ["task-fav"],
      toggleProject,
      toggleTask,
      loading: false
    })
  };
});

const projects: ProjectDto[] = [
  {
    id: "proj-a",
    workspaceId: "ws-1",
    name: "Alpha Project",
    color: "#111111",
    clientName: null,
    budgetHours: null,
    isActive: true,
    timesheetApprovalPeriod: null
  },
  {
    id: "proj-b",
    workspaceId: "ws-1",
    name: "Beta Favorite",
    color: "#222222",
    clientName: null,
    budgetHours: null,
    isActive: true,
    timesheetApprovalPeriod: null
  },
  {
    id: "proj-1",
    workspaceId: "ws-1",
    name: "Main",
    color: "#333333",
    clientName: null,
    budgetHours: null,
    isActive: true,
    timesheetApprovalPeriod: null
  }
];

const categories: CategoryDto[] = [
  {
    id: "cat-1",
    workspaceId: "ws-1",
    name: "Dev",
    description: null,
    isActive: true
  }
];

const tasks: TaskDto[] = [
  {
    id: "task-1",
    projectId: "proj-1",
    categoryId: "cat-1",
    categoryName: "Dev",
    taskName: "Regular Task",
    billableDefault: true,
    isCommon: true,
    isActive: true,
    assignees: []
  },
  {
    id: "task-fav",
    projectId: "proj-1",
    categoryId: "cat-1",
    categoryName: "Dev",
    taskName: "Favorite Task",
    billableDefault: true,
    isCommon: true,
    isActive: true,
    assignees: []
  }
];

describe("TimeTrackerQuickAddBar favorites", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("lists favorite projects first in the project dropdown", async () => {
    render(
      <TimeTrackerQuickAddBar
        projects={projects}
        tasks={tasks}
        categories={categories}
        timezone="UTC"
        onSubmit={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Project" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("combobox", { name: "Project" }));

    await waitFor(() => {
      expect(screen.getByText("Beta Favorite")).toBeTruthy();
    });

    const list = screen.getByRole("listbox");
    const options = within(list).getAllByRole("option");
    expect(options[0]?.textContent).toContain("Beta Favorite");
    expect(options.map((o) => o.textContent).join(" ")).toContain("Alpha Project");
    expect(screen.getByLabelText(/unfavorite beta favorite/i)).toBeTruthy();
  });

  it("lists favorite tasks in a Favorites group at the top", async () => {
    render(
      <TimeTrackerQuickAddBar
        projects={projects}
        tasks={tasks}
        categories={categories}
        timezone="UTC"
        onSubmit={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Project" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("combobox", { name: "Project" }));
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Main/i })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("option", { name: /Main/i }));

    await waitFor(() => {
      const taskTrigger = screen.getByRole("combobox", { name: "Task" });
      expect((taskTrigger as HTMLButtonElement).disabled).toBe(false);
    });

    fireEvent.click(screen.getByRole("combobox", { name: "Task" }));

    await waitFor(() => {
      expect(screen.getByText("Favorites")).toBeTruthy();
      expect(screen.getByText("Favorite Task")).toBeTruthy();
    });

    const list = screen.getByRole("listbox");
    const options = within(list).getAllByRole("option");
    expect(options[0]?.textContent).toContain("Favorite Task");
    expect(screen.getByLabelText(/unfavorite favorite task/i)).toBeTruthy();
  });
});
