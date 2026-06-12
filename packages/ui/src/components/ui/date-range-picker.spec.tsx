import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DateRangePicker } from "./date-range-picker.js";

describe("DateRangePicker", () => {
  it("shows the selected range on the trigger", () => {
    render(
      <DateRangePicker
        from="2026-06-08"
        to="2026-06-14"
        onChange={vi.fn()}
        ariaLabel="Date range"
      />
    );

    expect(screen.getByRole("button", { name: "Date range" })).toHaveTextContent(
      "Jun 8 – Jun 14, 2026"
    );
  });

  it("applies a newly selected range", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DateRangePicker
        from="2026-06-01"
        to="2026-06-07"
        onChange={onChange}
        ariaLabel="Date range"
        numberOfMonths={1}
      />
    );

    await user.click(screen.getByRole("button", { name: "Date range" }));
    await user.click(screen.getByRole("button", { name: "2026-06-10" }));
    await user.click(screen.getByRole("button", { name: "2026-06-12" }));
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(onChange).toHaveBeenCalledWith("2026-06-10", "2026-06-12");
  });
});
