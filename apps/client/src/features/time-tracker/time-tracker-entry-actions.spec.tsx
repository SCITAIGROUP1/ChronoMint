/** @vitest-environment jsdom */
import type { TimeLogDto } from "@kloqra/contracts";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TimeTrackerEntryActions } from "./time-tracker-entry-actions";

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

describe("TimeTrackerEntryActions", () => {
  afterEach(cleanup);

  it("offers duplicate with edit and delete on an unlocked entry", () => {
    const onDuplicate = vi.fn();
    render(
      <TimeTrackerEntryActions
        log={log}
        locked={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={onDuplicate}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Entry actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Duplicate" }));
    expect(onDuplicate).toHaveBeenCalledWith(log);
  });

  it("offers duplicate on a locked entry so a new copy can be logged", () => {
    const onDuplicate = vi.fn();
    render(
      <TimeTrackerEntryActions
        log={log}
        locked
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={onDuplicate}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Entry actions" }));
    expect(screen.getByRole("menuitem", { name: "View" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Delete" })).toBeNull();
    fireEvent.click(screen.getByRole("menuitem", { name: "Duplicate" }));
    expect(onDuplicate).toHaveBeenCalledWith(log);
  });
});
