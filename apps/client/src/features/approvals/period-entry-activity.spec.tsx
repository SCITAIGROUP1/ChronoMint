/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APPROVALS_EXPANDED_CELL_CLASS, PendingActivity } from "./period-entry-activity";

const api = vi.fn();

vi.mock("@/lib/api", () => ({
  api: (...args: unknown[]) => api(...args)
}));

vi.mock("@kloqra/web-shared", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useTasksListQuery: () => ({
      data: [{ id: "task-1", taskName: "Wireframes & flows", projectId: "proj-1" }]
    })
  };
});

const item = {
  id: "period-1",
  userId: "user-1",
  projectId: "proj-1",
  projectName: "Client Portal Redesign",
  periodStart: "2026-08-03T00:00:00.000Z",
  periodEnd: "2026-08-09T23:59:59.999Z"
};

const log = {
  id: "log-1",
  userId: "user-1",
  taskId: "task-1",
  startTime: "2026-08-08T15:01:00.000Z",
  endTime: "2026-08-08T16:31:00.000Z",
  durationSec: 5400,
  description: "Asset export — Client Portal Redesign",
  isBillable: true,
  source: "manual" as const,
  classification: "PROJECT" as const
};

describe("PendingActivity", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    api.mockImplementation((path: string) => {
      if (String(path).includes("audit-events")) {
        return Promise.resolve({ items: [] });
      }
      return Promise.resolve({ items: [log] });
    });
  });

  it("keeps a nested toggle on cards and loads entries only after open", async () => {
    render(<PendingActivity item={item} workspaceId="ws-1" timezone="UTC" />);

    expect(screen.getByRole("button", { name: "View entry activity" })).toBeTruthy();
    expect(screen.queryByText("Wireframes & flows")).toBeNull();
    expect(api).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "View entry activity" }));

    await waitFor(() => {
      expect(screen.getByText("Wireframes & flows")).toBeTruthy();
    });
    expect(screen.getByText("Logged entries in this submission")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hide entry activity" })).toBeTruthy();
  });

  it("shows table activity immediately without a nested toggle", async () => {
    render(<PendingActivity item={item} workspaceId="ws-1" timezone="UTC" layout="table" />);

    expect(screen.queryByRole("button", { name: /entry activity/i })).toBeNull();
    expect(screen.getByTestId("period-entry-activity").getAttribute("data-layout")).toBe("table");
    expect(screen.getByTestId("period-entry-activity").className).toContain("whitespace-normal");

    await waitFor(() => {
      expect(screen.getByText("Wireframes & flows")).toBeTruthy();
    });
    expect(screen.getByText("Logged entries in this submission")).toBeTruthy();
    expect(screen.getByText(/Asset export/)).toBeTruthy();
  });

  it("does not let expanded table cells inherit nowrap clipping", () => {
    expect(APPROVALS_EXPANDED_CELL_CLASS).toContain("whitespace-normal");
    expect(APPROVALS_EXPANDED_CELL_CLASS).toContain("first:pl-0");
    expect(APPROVALS_EXPANDED_CELL_CLASS).toContain("p-0");
  });
});
