/** @vitest-environment jsdom */
import type * as WebSharedModule from "@kloqra/web-shared";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_VISIBLE_KEY } from "./analytics-visibility";
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
vi.mock("./time-tracker-filters-panel", () => ({ TimeTrackerFiltersPanel: () => null }));
vi.mock("./time-tracker-week-list", () => ({
  TimeTrackerWeekList: () => <div data-testid="week-list">Week list</div>,
  formatVisibleWeeksSummary: () => ""
}));
vi.mock("./time-tracker-quick-add-bar", () => ({
  TimeTrackerQuickAddBar: ({
    onSubmit,
    saving
  }: {
    onSubmit: (draft: Record<string, unknown>) => void;
    saving?: boolean;
  }) => (
    <form
      aria-label="Quick add time entry"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({
          projectId: "project-1",
          taskSelection: "task-1",
          date: "2026-06-12",
          startTime: "09:00",
          endTime: "09:30",
          description: "",
          isBillable: true,
          recurrence: "none"
        });
      }}
    >
      <button type="submit" disabled={saving}>
        Add entry
      </button>
    </form>
  )
}));
vi.mock("./time-tracker-stat-cards", () => ({
  TimeTrackerStatCards: () => <div data-testid="analytics-cards">Analytics</div>
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
  TimeEntryDialog: () => null
}));

describe("PersonalTimeTrackerPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    create.mockReset().mockResolvedValue({ id: "log-1" });
    refresh.mockClear();
    api.mockClear();
  });
  afterEach(cleanup);

  it("creates from the flush quick-add bar and refreshes the mounted list", async () => {
    render(<PersonalTimeTrackerPage />);

    expect(screen.getByRole("form", { name: "Quick add time entry" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add Entry" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Add entry" }));

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

  it("ignores a second create while the first is still in flight", async () => {
    let resolveCreate: ((value: { id: string }) => void) | undefined;
    create.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
    );
    render(<PersonalTimeTrackerPage />);

    fireEvent.click(screen.getByRole("button", { name: "Add entry" }));
    fireEvent.click(screen.getByRole("button", { name: "Add entry" }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    resolveCreate?.({ id: "log-1" });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it("toggles analytics cards and persists preference", async () => {
    render(<PersonalTimeTrackerPage />);
    expect(screen.queryByTestId("analytics-cards")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show analytics" }));
    expect(screen.getByTestId("analytics-cards")).toBeTruthy();
    expect(window.localStorage.getItem(ANALYTICS_VISIBLE_KEY)).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Hide analytics" }));
    expect(screen.queryByTestId("analytics-cards")).toBeNull();
    expect(window.localStorage.getItem(ANALYTICS_VISIBLE_KEY)).toBe("false");
  });
});
