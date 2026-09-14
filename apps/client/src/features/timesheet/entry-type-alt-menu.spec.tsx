/** @vitest-environment jsdom */
import type { TenantActivityTypeDto } from "@kloqra/contracts";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EntryTypeAltMenu } from "./entry-type-alt-menu";

afterEach(() => {
  cleanup();
});

const activityTypes: TenantActivityTypeDto[] = [
  {
    id: "org-1",
    tenantId: "t1",
    name: "Organizational",
    slug: "organizational",
    color: "#0d9488",
    isSystem: true,
    isActive: true
  },
  {
    id: "rec-1",
    tenantId: "t1",
    name: "Recreational",
    slug: "recreational",
    color: "#059669",
    isSystem: true,
    isActive: true
  },
  {
    id: "event-1",
    tenantId: "t1",
    name: "Office Event",
    slug: "office_event",
    color: "#0d9488",
    isSystem: true,
    isActive: true
  }
];

describe("EntryTypeAltMenu", () => {
  it("groups leave as public, full, and half behind a link", async () => {
    const onSelect = vi.fn();
    render(<EntryTypeAltMenu value="PROJECT" activityTypes={activityTypes} onSelect={onSelect} />);

    expect(screen.queryByRole("combobox", { name: "Entry type" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /leave or other time/i }));

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: "Full" })).toBeTruthy();
    });
    expect(screen.getByText("Leave")).toBeTruthy();
    expect(screen.getByText("Other")).toBeTruthy();
    expect(screen.queryByRole("radio", { name: "Office Event" })).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: "Full" }));
    expect(onSelect).toHaveBeenCalledWith({ classification: "LEAVE_FULL" });
  });

  it("offers recreational and organizational under other", async () => {
    const onSelect = vi.fn();
    render(<EntryTypeAltMenu value="PROJECT" activityTypes={activityTypes} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: /leave or other time/i }));
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: "Recreational" })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("radio", { name: "Recreational" }));
    expect(onSelect).toHaveBeenCalledWith({
      classification: "TENANT_ACTIVITY",
      activityTypeId: "rec-1"
    });
  });

  it("lets a non-project type switch back to project work", () => {
    const onSelect = vi.fn();
    render(<EntryTypeAltMenu value="PUBLIC_HOLIDAY" onSelect={onSelect} />);

    expect(screen.getByRole("radio", { name: "Public" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Project work" }));
    expect(onSelect).toHaveBeenCalledWith({ classification: "PROJECT" });
  });

  it("shows a read-only type badge when switching is disabled", () => {
    render(<EntryTypeAltMenu value="LEAVE_HALF" disabled onSelect={vi.fn()} />);

    expect(screen.getByText("Half")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /leave or other time/i })).toBeNull();
    expect(screen.queryByRole("button", { name: "Project work" })).toBeNull();
  });

  it("notifies when the leave picker opens", () => {
    const onExpandedChange = vi.fn();
    render(
      <EntryTypeAltMenu
        value="PROJECT"
        activityTypes={activityTypes}
        onSelect={vi.fn()}
        onExpandedChange={onExpandedChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /leave or other time/i }));
    expect(onExpandedChange).toHaveBeenCalledWith(true);
  });
});
