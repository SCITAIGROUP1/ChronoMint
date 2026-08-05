/** @vitest-environment jsdom */
import type { TimeLogDto } from "@kloqra/contracts";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TimeTrackerEntryListItem } from "./time-tracker-entry-list-item";

vi.mock("./time-tracker-entry-actions", () => ({
  TimeTrackerEntryActions: () => null
}));

const log: TimeLogDto = {
  id: "log-1",
  userId: "user-1",
  taskId: "task-1",
  startTime: "2026-06-12T13:05:00.000Z",
  endTime: "2026-06-12T14:35:00.000Z",
  durationSec: 5400,
  description: "Worked on docs",
  isBillable: true,
  source: "manual"
};

describe("TimeTrackerEntryListItem", () => {
  afterEach(cleanup);

  it("shows start–end and duration on a single compact row", () => {
    render(
      <TimeTrackerEntryListItem
        log={log}
        task={{
          id: "task-1",
          projectId: "project-1",
          taskName: "Docs",
          isActive: true,
          billableDefault: true,
          isCommon: false,
          categoryId: "cat-1",
          categoryName: "General",
          assignees: []
        }}
        projectName="Project Alpha"
        entryColor="#236bfe"
        submissionByKey={new Map()}
        locked={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        timezone="UTC"
      />
    );

    expect(screen.getByLabelText("Time range 13:05 – 14:35")).toBeTruthy();
    expect(screen.getByText("13:05 – 14:35")).toBeTruthy();
  });
});
