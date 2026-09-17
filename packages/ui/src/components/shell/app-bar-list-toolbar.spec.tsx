import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppBarListToolbar } from "./app-bar-list-toolbar.js";

describe("AppBarListToolbar", () => {
  it("renders search, filters, and action", () => {
    render(
      <AppBarListToolbar
        searchValue=""
        onSearchChange={() => {}}
        searchAriaLabel="Search items"
        filters={<select aria-label="Filter by status" />}
        action={<button type="button">Add item</button>}
      />
    );

    expect(screen.getByRole("textbox", { name: "Search items" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Filter by status" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add item" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
  });

  it("calls onSearchChange when typing", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();

    render(
      <AppBarListToolbar
        searchValue=""
        onSearchChange={onSearchChange}
        searchAriaLabel="Search items"
      />
    );

    await user.type(screen.getByRole("textbox", { name: "Search items" }), "alpha");
    expect(onSearchChange).toHaveBeenCalled();
  });

  it("opens a filter sheet from the compact Filters button", async () => {
    const user = userEvent.setup();

    render(
      <AppBarListToolbar
        searchValue=""
        onSearchChange={() => {}}
        searchAriaLabel="Search items"
        filters={<select aria-label="Filter by status" />}
        filterCount={2}
      />
    );

    await user.click(screen.getByRole("button", { name: "Filters, 2 active" }));
    const dialog = screen.getByRole("dialog", { name: "Filters" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("combobox", { name: "Filter by status" })).toBeInTheDocument();
  });

  it("puts extra actions behind an overflow menu on compact", async () => {
    const user = userEvent.setup();

    render(
      <AppBarListToolbar
        searchValue=""
        onSearchChange={() => {}}
        searchAriaLabel="Search items"
        moreActions={<button type="button">Bulk Import</button>}
        action={<button type="button">Add item</button>}
      />
    );

    expect(screen.getByRole("button", { name: "More actions" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "More actions" }));
    expect(screen.getAllByRole("button", { name: "Bulk Import" }).length).toBeGreaterThan(0);
  });
});
