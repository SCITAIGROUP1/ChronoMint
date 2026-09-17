import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppBarFilterSheet } from "./app-bar-filter-sheet.js";

describe("AppBarFilterSheet", () => {
  it("renders filters and completes with Done", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onClearFilters = vi.fn();

    render(
      <AppBarFilterSheet
        open
        onOpenChange={onOpenChange}
        filterCount={1}
        onClearFilters={onClearFilters}
      >
        <select aria-label="Filter by role" />
      </AppBarFilterSheet>
    );

    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Filter by role" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(onClearFilters).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
