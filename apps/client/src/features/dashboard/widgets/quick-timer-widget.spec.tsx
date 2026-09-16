// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuickTimerWidget } from "./quick-timer-widget";

const pause = vi.fn().mockResolvedValue(undefined);
const stop = vi.fn().mockResolvedValue(undefined);

vi.mock("@/features/timer/use-timer-actions", () => ({
  useTimerActions: () => ({
    disabled: false,
    start: vi.fn(),
    pause,
    resume: vi.fn(),
    stop
  })
}));

vi.mock("@/stores/timer.store", () => ({
  isActiveTimer: (active: unknown) => Boolean(active),
  useTimerStore: () => ({
    active: {
      workspaceId: "ws",
      userId: "user",
      taskId: "task",
      startedAt: "2026-07-21T10:00:00.000Z",
      elapsedSec: 90,
      isPaused: false
    },
    elapsedSec: 90,
    tick: vi.fn()
  })
}));

describe("QuickTimerWidget", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("controls the active timer through shared actions", async () => {
    render(
      <QuickTimerWidget
        workspaceId="ws"
        projects={[{ id: "project", name: "Apollo", color: "#2563eb" }]}
        tasks={[
          {
            id: "task",
            projectId: "project",
            taskName: "Build",
            billableDefault: true
          }
        ]}
      />
    );

    expect(screen.getByText("00:01:30")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    await waitFor(() => expect(pause).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    await waitFor(() =>
      expect(stop).toHaveBeenCalledWith({ description: undefined, isBillable: true })
    );
  });
});
