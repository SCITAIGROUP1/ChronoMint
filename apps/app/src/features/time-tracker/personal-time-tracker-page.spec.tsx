/** @vitest-environment jsdom */
import type * as WebSharedModule from "@kloqra/web-shared";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PersonalTimeTrackerPage } from "./personal-time-tracker-page";

const create = vi.fn();
const refresh = vi.fn().mockResolvedValue(undefined);
const api = vi.fn();
let mutationOptions: { onLocalRefresh?: () => Promise<void>; listPaths?: string[] };

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
    useEntryCatalogQueries: () => ({
      projects: [{ id: "project-1", name: "Assigned project", isActive: true }],
      tasks: [
        {
          id: "task-1",
          projectId: "project-1",
          taskName: "Assigned task",
          isActive: true,
          billableDefault: true
        }
      ],
      categories: [],
      isLoading: false
    }),
    useTimesheetSubmissionStatusQuery: () => ({ submissionByKey: new Map() }),
    useTimelogMutations: (
      _workspaceId: string,
      options: { onLocalRefresh?: () => Promise<void>; listPaths?: string[] }
    ) => {
      mutationOptions = options;
      return {
        create: async (body: unknown) => {
          const result = await create(body);
          await options.onLocalRefresh?.();
          return result;
        },
        createBatch: vi.fn(),
        update: vi.fn(),
        remove: vi.fn()
      };
    }
  };
});
vi.mock("./use-time-tracker-logs", () => ({
  useTimeTrackerLogs: () => ({
    logs: [],
    listPath: "/timelogs?scope=mine",
    loading: false,
    error: null,
    refresh
  })
}));
vi.mock("./time-tracker-export-modal", () => ({ TimeTrackerExportModal: () => null }));
vi.mock("./time-tracker-import-modal", () => ({ TimeTrackerImportModal: () => null }));
vi.mock("./time-tracker-stat-cards", () => ({ TimeTrackerStatCards: () => null }));
vi.mock("./time-tracker-filters-panel", () => ({ TimeTrackerFiltersPanel: () => null }));
vi.mock("./time-tracker-week-list", () => ({
  TimeTrackerWeekList: () => <div data-testid="week-list">Week list</div>,
  formatVisibleWeeksSummary: () => ""
}));
vi.mock("@/hooks/use-is-impersonating", () => ({ useIsImpersonating: () => false }));
vi.mock("@/stores/session.store", () => ({
  useSessionStore: (selector: (state: unknown) => unknown) =>
    selector({
      session: { workspaceId: "workspace-1", user: { id: "user-1" } }
    })
}));
vi.mock("@/stores/workspaces.store", () => ({
  useWorkspacesStore: (selector: (state: { workspaces: unknown[] }) => unknown) =>
    selector({ workspaces: [] })
}));
vi.mock("@/lib/api", () => ({ api }));
vi.mock("@/features/timesheet/validate-time-entry-overlap", () => ({
  validateTimeEntryOverlap: vi.fn().mockResolvedValue(null)
}));
vi.mock("@/features/timesheet/timesheet-lazy", () => ({
  TimeEntryDialog: ({
    open,
    draft,
    projects,
    tasks,
    onDraftChange,
    onSave
  }: {
    open: boolean;
    draft: Record<string, unknown> | null;
    projects: { name: string }[];
    tasks: { taskName: string }[];
    onDraftChange: (draft: Record<string, unknown>) => void;
    onSave: () => void;
  }) =>
    open && draft ? (
      <div role="dialog" aria-label="Log time">
        <span>{projects[0]?.name}</span>
        <span>{tasks[0]?.taskName}</span>
        <button
          type="button"
          onClick={() =>
            onDraftChange({ ...draft, projectId: "project-1", taskSelection: "task-1" })
          }
        >
          Choose assigned task
        </button>
        <button type="button" onClick={onSave}>
          Save entry
        </button>
      </div>
    ) : null
}));

describe("PersonalTimeTrackerPage Add Entry", () => {
  beforeEach(() => {
    create.mockReset().mockResolvedValue({ id: "log-1" });
    refresh.mockClear();
    api.mockClear();
  });
  afterEach(cleanup);

  it("opens the self-scoped time entry dialog and refreshes its mounted list after create", async () => {
    render(<PersonalTimeTrackerPage />);

    fireEvent.click(screen.getByRole("button", { name: "Add Entry" }));
    expect(screen.getByRole("dialog", { name: "Log time" })).toBeTruthy();
    expect(screen.getByText("Assigned project")).toBeTruthy();
    expect(screen.getByText("Assigned task")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Choose assigned task" }));
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: "task-1",
          description: undefined,
          isBillable: true
        })
      )
    );
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(mutationOptions.listPaths).toEqual(["/timelogs?scope=mine"]);
    expect(api).not.toHaveBeenCalled();
  });
});
