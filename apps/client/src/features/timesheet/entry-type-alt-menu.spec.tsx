/** @vitest-environment jsdom */
import type { TenantActivityTypeDto } from "@kloqra/contracts";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EntryTypeAltMenu } from "./entry-type-alt-menu";

afterEach(() => {
  cleanup();
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);
HTMLElement.prototype.scrollIntoView = () => {};

const activityTypes: TenantActivityTypeDto[] = [
  {
    id: "org-1",
    tenantId: "t1",
    name: "Organizational",
    slug: "organizational",
    color: "#0d9488",
    isSystem: true,
    isActive: true,
    parentId: null
  },
  {
    id: "rec-1",
    tenantId: "t1",
    name: "Recreational",
    slug: "recreational",
    color: "#059669",
    isSystem: true,
    isActive: true,
    parentId: null
  },
  {
    id: "event-1",
    tenantId: "t1",
    name: "Office Event",
    slug: "office_event",
    color: "#0d9488",
    isSystem: true,
    isActive: true,
    parentId: null
  },
  {
    id: "training-1",
    tenantId: "t1",
    name: "Training",
    slug: "training",
    color: "#7c3aed",
    isSystem: false,
    isActive: true,
    parentId: null
  },
  {
    id: "workshop-1",
    tenantId: "t1",
    name: "Workshop",
    slug: "workshop",
    color: "#a855f7",
    isSystem: false,
    isActive: true,
    parentId: "training-1"
  },
  {
    id: "holiday-1",
    tenantId: "t1",
    name: "Holiday",
    slug: "holiday",
    color: "#d97706",
    isSystem: false,
    isActive: true,
    parentId: null
  },
  {
    id: "public-holiday-1",
    tenantId: "t1",
    name: "Public Holiday",
    slug: "public_holiday",
    color: "#d97706",
    isSystem: false,
    isActive: true,
    parentId: "holiday-1"
  }
];

describe("EntryTypeAltMenu", () => {
  it("opens an activity select instead of leave chips", async () => {
    const onSelect = vi.fn();
    render(<EntryTypeAltMenu value="PROJECT" activityTypes={activityTypes} onSelect={onSelect} />);

    expect(screen.queryByRole("combobox", { name: "Activity" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /other time/i }));

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Activity" })).toBeTruthy();
    });
    expect(screen.queryByText("Type")).toBeNull();
    expect(screen.queryByText("Leave")).toBeNull();
    expect(screen.queryByRole("radio", { name: "Full" })).toBeNull();
    expect(screen.queryByRole("radio", { name: "Public" })).toBeNull();
  });

  it("lists leaf activities and groups sub-activities under the parent name", async () => {
    const onSelect = vi.fn();
    render(<EntryTypeAltMenu value="PROJECT" activityTypes={activityTypes} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: /other time/i }));
    fireEvent.click(screen.getByRole("combobox", { name: "Activity" }));

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeTruthy();
    });

    const list = screen.getByRole("listbox");
    expect(within(list).getByText("Office Event")).toBeTruthy();
    expect(within(list).getByText("Organizational")).toBeTruthy();
    expect(within(list).getByText("Training")).toBeTruthy();
    expect(within(list).getByText("Holiday")).toBeTruthy();
    expect(within(list).getByText("Workshop")).toBeTruthy();
    expect(within(list).getByText("Public Holiday")).toBeTruthy();
    expect(within(list).queryByRole("option", { name: "Training" })).toBeNull();
    expect(within(list).queryByRole("option", { name: "Holiday" })).toBeNull();

    fireEvent.click(within(list).getByRole("option", { name: "Workshop" }));
    expect(onSelect).toHaveBeenCalledWith({
      classification: "TENANT_ACTIVITY",
      activityTypeId: "workshop-1"
    });
  });

  it("does not invent activities when the catalog is empty", async () => {
    render(<EntryTypeAltMenu value="PROJECT" activityTypes={[]} onSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /other time/i }));
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Activity" })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("combobox", { name: "Activity" }));
    await waitFor(() => {
      expect(screen.getByText("No organization activities yet.")).toBeTruthy();
    });
    expect(screen.queryByRole("radio", { name: "Full" })).toBeNull();
  });

  it("lets a non-project type switch back to project work", () => {
    const onSelect = vi.fn();
    render(
      <EntryTypeAltMenu value="PUBLIC_HOLIDAY" activityTypes={activityTypes} onSelect={onSelect} />
    );

    expect(screen.getByRole("combobox", { name: "Activity" })).toBeTruthy();
    expect(screen.queryByRole("radio", { name: "Public" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Project work" }));
    expect(onSelect).toHaveBeenCalledWith({ classification: "PROJECT" });
  });

  it("shows a read-only type badge when switching is disabled", () => {
    render(<EntryTypeAltMenu value="LEAVE_HALF" disabled onSelect={vi.fn()} />);

    expect(screen.getByText("Half-day leave")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /other time/i })).toBeNull();
    expect(screen.queryByRole("button", { name: "Project work" })).toBeNull();
  });

  it("notifies when the activity picker opens", () => {
    const onExpandedChange = vi.fn();
    render(
      <EntryTypeAltMenu
        value="PROJECT"
        activityTypes={activityTypes}
        onSelect={vi.fn()}
        onExpandedChange={onExpandedChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /other time/i }));
    expect(onExpandedChange).toHaveBeenCalledWith(true);
  });
});
