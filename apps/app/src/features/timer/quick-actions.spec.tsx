/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuickActions } from "./quick-actions";

const { toggleTask, catalogProjects, catalogTasks, emptyTimelogItems, favoritedTasks } = vi.hoisted(
  () => {
    const toggleTask = vi.fn();
    const catalogProjects = [
      { id: "project-1", name: "Platform", color: "#7c3aed", isActive: true },
      { id: "project-2", name: "Mobile", color: "#111111", isActive: true }
    ];
    const catalogTasks = [
      {
        id: "task-1",
        projectId: "project-1",
        taskName: "API work",
        categoryName: "Dev",
        isActive: true,
        billableDefault: true
      },
      {
        id: "task-2",
        projectId: "project-2",
        taskName: "UI polish",
        categoryName: "Design",
        isActive: true,
        billableDefault: true
      }
    ];
    const emptyTimelogItems: unknown[] = [];
    const favoritedTasks = [
      {
        projectId: "project-1",
        taskId: "task-1",
        projectName: "Platform",
        taskName: "API work",
        projectColor: "#7c3aed"
      }
    ];
    return { toggleTask, catalogProjects, catalogTasks, emptyTimelogItems, favoritedTasks };
  }
);

vi.mock("lucide-react", () => ({
  Star: () => null,
  History: () => null,
  Pin: () => null,
  PinOff: () => null,
  Clock: () => null,
  TrendingUp: () => null
}));

vi.mock("@kloqra/ui", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({
    children,
    onClick,
    title,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    title?: string;
  }) => (
    <button type="button" onClick={onClick} title={title} {...rest}>
      {children}
    </button>
  ),
  ProjectColorDot: () => null
}));

vi.mock("@kloqra/web-shared", () => ({
  MAX_FAVORITE_TASKS: 5,
  useEntryCatalogQueries: () => ({
    projects: catalogProjects,
    tasks: catalogTasks,
    categories: [],
    isLoading: false,
    refetch: vi.fn()
  }),
  useEntryFavorites: () => ({
    favorites: {
      version: 2,
      projects: ["project-1"],
      tasks: favoritedTasks
    },
    favoriteProjectIds: ["project-1"],
    favoriteTaskIds: ["task-1"],
    toggleProject: vi.fn(),
    toggleTask,
    loading: false
  }),
  useTimelogListQuery: () => ({ data: { items: emptyTimelogItems }, refetch: vi.fn() })
}));

vi.mock("@/stores/session.store", () => ({
  useSessionStore: (selector: (state: { session: unknown }) => unknown) =>
    selector({
      session: {
        workspaceId: "ws-1",
        user: { id: "user-1", name: "Avery" }
      }
    })
}));

vi.mock("@/lib/api", () => ({
  api: vi.fn().mockResolvedValue({
    totalSec: 0,
    billableSec: 0,
    topTask: null,
    logCount: 0
  })
}));

describe("QuickActions favorites", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders pinned favorites and selects a task on click", () => {
    const onSelect = vi.fn();
    render(<QuickActions onSelect={onSelect} mode="favorites" />);

    expect(screen.getByText("Platform")).toBeTruthy();
    expect(screen.getByText("API work")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Platform/i }));
    expect(onSelect).toHaveBeenCalledWith("project-1", "task-1");
  });

  it("filters favorites by project when filterProjectId is set", () => {
    render(<QuickActions onSelect={vi.fn()} mode="favorites" filterProjectId="project-2" />);

    expect(screen.getByText(/No pinned tasks yet/i)).toBeTruthy();
    expect(screen.queryByText("API work")).toBeNull();
  });

  it("pins the current task via useEntryFavorites.toggleTask", () => {
    render(
      <QuickActions
        onSelect={vi.fn()}
        mode="all"
        currentProjectId="project-2"
        currentTaskId="task-2"
      />
    );

    fireEvent.click(screen.getByTitle("Pin current task"));
    expect(toggleTask).toHaveBeenCalledWith({
      projectId: "project-2",
      taskId: "task-2",
      projectName: "Mobile",
      taskName: "UI polish",
      projectColor: "#111111"
    });
  });

  it("shows unpin control when the current task is already favorited", () => {
    render(
      <QuickActions
        onSelect={vi.fn()}
        mode="all"
        currentProjectId="project-1"
        currentTaskId="task-1"
      />
    );

    expect(screen.getByTitle("Unpin current task")).toBeTruthy();
  });
});
