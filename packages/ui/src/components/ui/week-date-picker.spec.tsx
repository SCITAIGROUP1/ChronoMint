import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WeekDatePicker } from "./week-date-picker.js";

describe("WeekDatePicker", () => {
  it("shows the current range label on the trigger", () => {
    render(
      <WeekDatePicker
        anchorDate="2026-06-10"
        onChange={vi.fn()}
        label="Jun 8 – Jun 14, 2026"
        ariaLabel="Jump to week"
      />
    );

    expect(screen.getByRole("button", { name: "Jump to week" })).toHaveTextContent(
      "Jun 8 – Jun 14, 2026"
    );
  });

  it("jumps to the selected week when a day is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <WeekDatePicker
        anchorDate="2026-06-08"
        onChange={onChange}
        label="Jun 8 – Jun 14, 2026"
        ariaLabel="Jump to week"
      />
    );

    await user.click(screen.getByRole("button", { name: "Jump to week" }));
    await user.click(screen.getByRole("button", { name: "2026-06-20" }));

    expect(onChange).toHaveBeenCalledWith("2026-06-20");
  });

  it("highlights today with distinct primary styling", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-10T12:00:00"));

    const user = userEvent.setup();

    render(
      <WeekDatePicker
        anchorDate="2026-06-01"
        onChange={vi.fn()}
        label="Jun 1 – Jun 7, 2026"
        ariaLabel="Jump to week"
      />
    );

    await user.click(screen.getByRole("button", { name: "Jump to week" }));

    const today = screen.getByRole("button", { name: "2026-06-10" });
    expect(today).toHaveClass("bg-primary");
    expect(today).toHaveClass("text-primary-foreground");
    expect(today).toHaveAttribute("aria-current", "date");
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
