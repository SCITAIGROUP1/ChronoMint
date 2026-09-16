/** @vitest-environment jsdom */
import type * as UiModule from "@kloqra/ui";
import type * as WebSharedModule from "@kloqra/web-shared";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { TimerPage } from "./timer-page";

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

const start = vi.fn().mockResolvedValue({
  userId: "user-1",
  workspaceId: "ws-1",
  taskId: "task-1",
  startedAt: "2026-07-28T10:00:00.000Z",
  elapsedSec: 0
});
const stop = vi.fn().mockResolvedValue({
  id: "log-1",
  userId: "user-1",
  taskId: "task-1",
  startTime: "2026-07-28T10:00:00.000Z",
  endTime: "2026-07-28T11:00:00.000Z",
  durationSec: 3600,
  description: "Platform work",
  isBillable: true,
  source: "timer"
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const toggleProject = vi.fn();
const toggleTask = vi.fn();

vi.mock("@kloqra/web-shared", async (importOriginal) => {
  const actual = await importOriginal<typeof WebSharedModule>();
  return {
    ...actual,
    useDisplayPreferences: () => ({
      timezone: "UTC",
      weekStart: "monday",
      dateFormat: "MM/dd/yyyy",
      timeFormat: "24h"
    }),
    useEntryFavorites: () => ({
      favorites: {
        version: 2,
        projects: ["project-fav"],
        tasks: [{ projectId: "project-1", taskId: "task-fav", taskName: "Favorite Build" }]
      },
      favoriteProjectIds: ["project-fav"],
      favoriteTaskIds: ["task-fav"],
      toggleProject,
      toggleTask,
      loading: false
    }),
    useEntryCatalogQueries: () => ({
      projects: [
        { id: "project-1", name: "Platform API", color: "#7c3aed", isActive: true },
        { id: "project-fav", name: "Favorite Project", color: "#111111", isActive: true }
      ],
      tasks: [
        {
          id: "task-1",
          projectId: "project-1",
          taskName: "Build",
          categoryName: "Dev",
          isActive: true,
          billableDefault: true
        },
        {
          id: "task-fav",
          projectId: "project-1",
          taskName: "Favorite Build",
          categoryName: "Dev",
          isActive: true,
          billableDefault: true
        }
      ],
      categories: [],
      isLoading: false,
      refetch: vi.fn()
    }),
    useTimelogListQuery: () => ({ data: { items: [] }, refetch: vi.fn() }),
    useRefetchOnWindowFocus: vi.fn()
  };
});

vi.mock("./use-timer-actions", () => ({
  useTimerActions: () => ({
    disabled: false,
    start,
    stop,
    pause: vi.fn(),
    resume: vi.fn()
  })
}));

vi.mock("./timer-lazy", () => ({
  DailyGoalWidget: () => null,
  QuickActions: () => null,
  StaleTimerDialog: () => null
}));

vi.mock("@/hooks/use-active-timer-session", () => ({
  useActiveTimerSession: () => ({ refresh: vi.fn() })
}));

vi.mock("@/hooks/use-is-impersonating", () => ({ useIsImpersonating: () => false }));

vi.mock("@/hooks/use-jira-issues", () => ({
  useJiraIssues: () => ({ issues: [] })
}));

vi.mock("@/stores/session.store", () => ({
  getWorkspaceId: () => "ws-1",
  useSessionStore: (selector: (state: { session: unknown }) => unknown) =>
    selector({
      session: {
        workspaceId: "ws-1",
        user: { id: "user-1", name: "Avery" },
        tenantId: "tenant-1",
        workspaceName: "Meridian",
        workspaceRole: "OWNER"
      }
    })
}));

vi.mock("@/stores/workspaces.store", () => ({
  useWorkspacesStore: (selector: (state: { workspaces: unknown[] }) => unknown) =>
    selector({ workspaces: [{ id: "ws-1", name: "Meridian" }] })
}));

vi.mock("@/stores/active-timer-session.store", () => ({
  useActiveTimerSessionStore: () => null
}));

vi.mock("@/stores/timer.store", () => ({
  isActiveTimer: (active: unknown) => Boolean(active),
  useTimerStore: () => ({
    active: null,
    elapsedSec: 0,
    isPaused: false,
    setActive: vi.fn(),
    tick: vi.fn()
  })
}));

vi.mock("@/lib/api", () => ({
  api: vi.fn().mockResolvedValue({
    effectiveTimerStaleWarningHours: 8,
    jiraConnected: false
  })
}));

vi.mock("@/components/jira-issue-picker", () => ({
  JiraIssuePicker: () => null
}));

vi.mock("@kloqra/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof UiModule>();
  return {
    ...actual,
    SearchableSelect: ({
      value,
      onValueChange,
      options,
      groups,
      disabled,
      "aria-label": ariaLabel,
      placeholder
    }: {
      value: string;
      onValueChange: (value: string) => void;
      options?: { value: string; label: string }[];
      groups?: { label: string; options: { value: string; label: string }[] }[];
      disabled?: boolean;
      "aria-label"?: string;
      placeholder?: string;
    }) => {
      const flat = options ?? groups?.flatMap((g) => g.options) ?? [];
      return (
        <select
          aria-label={ariaLabel}
          value={value}
          disabled={disabled}
          onChange={(e) => onValueChange(e.target.value)}
        >
          <option value="">{placeholder}</option>
          {flat.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }
  };
});

describe("TimerPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("hides description until a task is selected, then shows it below task", async () => {
    render(<TimerPage />);

    await waitFor(() => {
      expect(screen.getByText("Start Timer")).toBeTruthy();
    });

    expect(screen.queryByLabelText("Description")).toBeNull();

    fireEvent.change(screen.getByLabelText("Project"), { target: { value: "project-1" } });
    fireEvent.change(screen.getByLabelText("Task"), { target: { value: "task-1" } });

    await waitFor(() => {
      expect(screen.getByLabelText("Description")).toBeTruthy();
    });

    const description = screen.getByLabelText("Description");
    expect(screen.getByPlaceholderText("What are you working on?")).toBeTruthy();
    fireEvent.change(description, { target: { value: "Platform work" } });
    expect(description).toHaveProperty("value", "Platform work");
  });

  it("lists favorite projects first in the project dropdown", async () => {
    render(<TimerPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Project")).toBeTruthy();
    });

    const projectSelect = screen.getByLabelText("Project");
    const options = [...projectSelect.querySelectorAll("option")].filter((o) => o.value);
    expect(options.map((o) => o.value)).toEqual(["project-fav", "project-1"]);
    expect(options[0]?.textContent).toContain("Favorite Project");
  });

  it("lists favorite tasks first after selecting a project", async () => {
    render(<TimerPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Project")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Project"), { target: { value: "project-1" } });

    await waitFor(() => {
      const taskSelect = screen.getByLabelText("Task");
      expect(taskSelect).not.toHaveProperty("disabled", true);
    });

    const taskSelect = screen.getByLabelText("Task");
    const options = [...taskSelect.querySelectorAll("option")].filter((o) => o.value);
    expect(options.map((o) => o.value)).toEqual(["task-fav", "task-1"]);
    expect(options[0]?.textContent).toContain("Favorite Build");
  });
});
