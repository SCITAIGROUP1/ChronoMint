/** @vitest-environment jsdom */
import type { ProjectDto, TaskDto, TimeLogDto } from "@kloqra/contracts";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TimeEntryDialog } from "./time-entry-dialog";
import type { TimeEntryDraft } from "./time-entry-draft";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);
HTMLElement.prototype.scrollIntoView = () => {};

vi.mock("@kloqra/web-shared", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useCategoriesListQuery: () => ({ data: [] }),
    useEntryFavorites: () => ({
      favorites: {
        version: 2,
        projects: ["proj-b"],
        tasks: [{ projectId: "proj-1", taskId: "task-fav", taskName: "Favorite Task" }]
      },
      favoriteProjectIds: ["proj-b"],
      favoriteTaskIds: ["task-fav"],
      toggleProject: vi.fn(),
      toggleTask: vi.fn(),
      loading: false
    })
  };
});

const draft: TimeEntryDraft = {
  date: "2026-06-09",
  projectId: "proj-1",
  taskSelection: "task-1",
  startTime: "13:04",
  endTime: "14:04",
  description: "Code review",
  isBillable: true
};

const editingLog: TimeLogDto = {
  id: "log-1",
  userId: "user-1",
  taskId: "task-1",
  startTime: "2026-06-09T13:04:00.000Z",
  endTime: "2026-06-09T14:04:00.000Z",
  durationSec: 3600,
  description: "Code review",
  isBillable: true,
  source: "manual"
};

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

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe("TimeEntryDialog", () => {
  it("lists favorite projects first in the project dropdown", async () => {
    render(
      <TimeEntryDialog
        open
        title="Log time"
        draft={{ ...draft, projectId: "", taskSelection: "" }}
        projects={projects}
        tasks={tasks}
        taskLabel={() => "Task"}
        onClose={vi.fn()}
        onDraftChange={vi.fn()}
        onSave={vi.fn()}
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
    expect(options[1]?.textContent).toContain("Alpha Project");
    expect(screen.getByLabelText(/unfavorite beta favorite/i)).toBeTruthy();
  });

  it("lists favorite tasks in a Favorites group at the top", async () => {
    render(
      <TimeEntryDialog
        open
        title="Log time"
        draft={{ ...draft, projectId: "proj-1", taskSelection: "" }}
        projects={[
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
        ]}
        tasks={tasks}
        taskLabel={() => "Task"}
        onClose={vi.fn()}
        onDraftChange={vi.fn()}
        onSave={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Task" })).toBeTruthy();
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

  it("hides save and delete actions when read-only", async () => {
    render(
      <TimeEntryDialog
        open
        title="Edit time entry"
        draft={draft}
        projects={[]}
        tasks={[]}
        taskLabel={() => "Task"}
        editingLog={editingLog}
        readOnly
        onClose={vi.fn()}
        onDraftChange={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/locked \(submitted or approved\)/i)).toBeTruthy();
    });

    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete entry" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Close" }).length).toBeGreaterThan(0);
  });

  it("allows editing a timer-created entry when it is otherwise editable", async () => {
    render(
      <TimeEntryDialog
        open
        title="Edit time entry"
        draft={draft}
        projects={[]}
        tasks={[]}
        taskLabel={() => "Task"}
        editingLog={{ ...editingLog, source: "timer" }}
        onClose={vi.fn()}
        onDraftChange={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/started with the stopwatch/i)).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "Save changes" })).toBeTruthy();
    expect(screen.getByLabelText("Start time")).toHaveProperty("disabled", false);
    expect(screen.getByLabelText("End time")).toHaveProperty("disabled", false);
  });

  it("renders server validation errors inline under fields", async () => {
    render(
      <TimeEntryDialog
        open
        title="Edit time entry"
        draft={draft}
        projects={[]}
        tasks={[]}
        taskLabel={() => "Task"}
        editingLog={editingLog}
        workspaceId="ws-1"
        error="Validation failed — Project Id is required; Task Selection is required; Start Time is required; End Time is required; Description is required"
        onClose={vi.fn()}
        onDraftChange={vi.fn()}
        onSave={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/project id is required/i)).toBeTruthy();
      expect(screen.getByText(/task selection is required/i)).toBeTruthy();
      expect(screen.getByText(/start time is required/i)).toBeTruthy();
      expect(screen.getByText(/end time is required/i)).toBeTruthy();
      expect(screen.getByText(/description is required/i)).toBeTruthy();
    });
  });

  it("renders When row with entry date picker", async () => {
    render(
      <TimeEntryDialog
        open
        title="Log time"
        draft={draft}
        projects={[]}
        tasks={[]}
        taskLabel={() => "Task"}
        onClose={vi.fn()}
        onDraftChange={vi.fn()}
        onSave={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("When")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Entry date" })).toBeTruthy();
      expect(screen.getByLabelText("Duration")).toBeTruthy();
      expect(screen.getByLabelText("Start time")).toBeTruthy();
      expect(screen.getByLabelText("End time")).toBeTruthy();
    });
  });

  it("treats 2.5 and 2:30 as the same duration from start", async () => {
    const onDraftChange = vi.fn();
    const base = { ...draft, startTime: "09:00", endTime: "09:30" };

    const { rerender } = render(
      <TimeEntryDialog
        open
        title="Log time"
        draft={base}
        projects={[]}
        tasks={[]}
        taskLabel={() => "Task"}
        onClose={vi.fn()}
        onDraftChange={onDraftChange}
        onSave={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Duration")).toBeTruthy();
    });

    const duration = screen.getByLabelText("Duration");
    fireEvent.focus(duration);
    fireEvent.change(duration, { target: { value: "2.5" } });

    expect(onDraftChange).toHaveBeenCalledWith(
      expect.objectContaining({
        startTime: "09:00",
        endTime: "11:30"
      })
    );

    onDraftChange.mockClear();
    rerender(
      <TimeEntryDialog
        open
        title="Log time"
        draft={base}
        projects={[]}
        tasks={[]}
        taskLabel={() => "Task"}
        onClose={vi.fn()}
        onDraftChange={onDraftChange}
        onSave={vi.fn()}
      />
    );

    fireEvent.focus(duration);
    fireEvent.change(duration, { target: { value: "2:30" } });

    expect(onDraftChange).toHaveBeenCalledWith(
      expect.objectContaining({
        startTime: "09:00",
        endTime: "11:30"
      })
    );
  });

  it("keeps duration length when start time moves", async () => {
    const onDraftChange = vi.fn();
    render(
      <TimeEntryDialog
        open
        title="Log time"
        draft={{ ...draft, startTime: "09:00", endTime: "10:00" }}
        projects={[]}
        tasks={[]}
        taskLabel={() => "Task"}
        onClose={vi.fn()}
        onDraftChange={onDraftChange}
        onSave={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Start time")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "10:00" } });

    expect(onDraftChange).toHaveBeenCalledWith(
      expect.objectContaining({
        startTime: "10:00",
        endTime: "11:00"
      })
    );
  });

  it("shows duration formatted from start and end", async () => {
    render(
      <TimeEntryDialog
        open
        title="Log time"
        draft={{ ...draft, startTime: "09:00", endTime: "11:30" }}
        projects={[]}
        tasks={[]}
        taskLabel={() => "Task"}
        onClose={vi.fn()}
        onDraftChange={vi.fn()}
        onSave={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Duration")).toHaveProperty("value", "2:30");
    });
  });

  it("shows repeat affordance on create but not on edit", async () => {
    const { rerender } = render(
      <TimeEntryDialog
        open
        title="Log time"
        draft={draft}
        projects={[]}
        tasks={[]}
        taskLabel={() => "Task"}
        onClose={vi.fn()}
        onDraftChange={vi.fn()}
        onSave={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "+ Repeat on more days" })).toBeTruthy();
    });

    rerender(
      <TimeEntryDialog
        open
        title="Edit time entry"
        draft={draft}
        projects={[]}
        tasks={[]}
        taskLabel={() => "Task"}
        editingLog={editingLog}
        onClose={vi.fn()}
        onDraftChange={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "+ Repeat on more days" })).toBeNull();
  });

  it("opens repeat panel and patches draft when repeat affordance is clicked", () => {
    const onDraftChange = vi.fn();
    render(
      <TimeEntryDialog
        open
        title="Log time"
        draft={draft}
        projects={[]}
        tasks={[]}
        taskLabel={() => "Task"}
        onClose={vi.fn()}
        onDraftChange={onDraftChange}
        onSave={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Repeat on more days" }));

    expect(onDraftChange).toHaveBeenCalledWith({
      ...draft,
      recurrence: "weekdays",
      repeatUntil: "2026-06-09"
    });
  });

  it("asks to discard before closing a dirty draft", async () => {
    const onClose = vi.fn();
    const onDraftChange = vi.fn();
    const { rerender } = render(
      <TimeEntryDialog
        open
        title="Log time"
        draft={draft}
        projects={[]}
        tasks={[]}
        taskLabel={() => "Task"}
        workspaceId="ws-1"
        onClose={onClose}
        onDraftChange={onDraftChange}
        onSave={vi.fn()}
      />
    );

    rerender(
      <TimeEntryDialog
        open
        title="Log time"
        draft={{ ...draft, description: "Changed description" }}
        projects={[]}
        tasks={[]}
        taskLabel={() => "Task"}
        workspaceId="ws-1"
        onClose={onClose}
        onDraftChange={onDraftChange}
        onSave={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: /discard unsaved changes/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("restores an unsaved draft from session storage on reopen", async () => {
    window.sessionStorage.setItem(
      "kloqra.time-entry-draft:ws-1:create",
      JSON.stringify({ ...draft, description: "Recovered work" })
    );
    const onDraftChange = vi.fn();

    render(
      <TimeEntryDialog
        open
        title="Log time"
        draft={draft}
        projects={[]}
        tasks={[]}
        taskLabel={() => "Task"}
        workspaceId="ws-1"
        onClose={vi.fn()}
        onDraftChange={onDraftChange}
        onSave={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(onDraftChange).toHaveBeenCalledWith(
        expect.objectContaining({ description: "Recovered work" })
      );
    });
    expect(screen.getByText(/restored your unsaved draft/i)).toBeTruthy();
  });
});
