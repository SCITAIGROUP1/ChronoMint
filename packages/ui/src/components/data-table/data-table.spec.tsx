import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableScroll,
  TablePagination,
  dataTableCardClass
} from "./data-table";

describe("DataTableCard", () => {
  it("uses flush card layout like time tracker tables", () => {
    const { container } = render(<DataTableCard>Content</DataTableCard>);
    const card = container.querySelector('[data-slot="card"]');
    expect(card?.className).toContain("p-0");
    expect(card?.className).toContain("gap-0");
    expect(card?.className).not.toContain("py-6");
    expect(dataTableCardClass).toContain("p-0");
  });

  it("fills leftover height with a sticky header scrollport", () => {
    const { container } = render(
      <DataTableCard fill>
        <DataTableScroll>Rows</DataTableScroll>
      </DataTableCard>
    );
    const card = container.querySelector('[data-slot="card"]');
    expect(card).toHaveAttribute("data-fill", "true");
    expect(card?.className).toContain("flex-1");
    expect(card?.className).toContain("min-h-0");
    expect(container.querySelector('[data-slot="data-table-scroll"]')?.className).toContain(
      "overflow-auto"
    );
  });

  it("hides meta columns on compact shell and can pin the first column", () => {
    render(
      <table>
        <thead>
          <tr>
            <DataTableHead sticky>Member</DataTableHead>
            <DataTableHead priority="meta">Status</DataTableHead>
          </tr>
        </thead>
        <tbody>
          <tr>
            <DataTableCell sticky>Ada</DataTableCell>
            <DataTableCell priority="meta">Active</DataTableCell>
          </tr>
        </tbody>
      </table>
    );

    const memberHead = screen.getByRole("columnheader", { name: "Member" });
    expect(memberHead).toHaveAttribute("data-sticky", "true");
    expect(memberHead.className).toContain("sticky");
    const statusHead = screen.getByRole("columnheader", { name: "Status" });
    expect(statusHead).toHaveAttribute("data-priority", "meta");
    expect(statusHead.className).toContain("hidden");
  });
});

describe("TablePagination", () => {
  it("navigates pages", () => {
    const onPageChange = vi.fn();
    render(
      <TablePagination page={2} totalPages={3} total={55} limit={20} onPageChange={onPageChange} />
    );

    expect(screen.getByText(/showing 21–40 of 55/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("hides rows-per-page selector when onLimitChange is omitted", () => {
    render(<TablePagination page={1} totalPages={1} total={5} limit={10} onPageChange={vi.fn()} />);
    expect(screen.queryByRole("combobox", { name: "Rows per page" })).toBeNull();
  });

  it("shows rows-per-page selector and calls onLimitChange", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    const onLimitChange = vi.fn();
    render(
      <TablePagination
        page={1}
        totalPages={2}
        total={30}
        limit={10}
        onPageChange={vi.fn()}
        onLimitChange={onLimitChange}
      />
    );

    expect(screen.getByRole("combobox", { name: "Rows per page" })).toHaveTextContent("10");
    await user.click(screen.getByRole("combobox", { name: "Rows per page" }));
    await user.click(screen.getByRole("option", { name: "25" }));
    expect(onLimitChange).toHaveBeenCalledWith(25);
  });

  it("supports custom page unit and summary", () => {
    render(
      <TablePagination
        page={2}
        totalPages={3}
        total={3}
        limit={1}
        onPageChange={vi.fn()}
        pageUnit="Week"
        pageSizeLabel="Weeks per page"
        summary="Week of Jun 1 – Week of Jun 15"
      />
    );

    expect(screen.getByText("Week of Jun 1 – Week of Jun 15")).toBeTruthy();
    expect(screen.getByText("Week 2 of 3")).toBeTruthy();
  });
});
