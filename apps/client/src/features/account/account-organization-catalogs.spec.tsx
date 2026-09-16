/** @vitest-environment jsdom */
import type { TenantActivityTypeDto } from "@kloqra/contracts";
import { ROUTES } from "@kloqra/contracts";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountOrganizationCatalogs } from "./account-organization-catalogs";
import { api } from "@/lib/api";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

vi.mock("@/lib/api", () => ({
  api: vi.fn()
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

const training: TenantActivityTypeDto = {
  id: "training-1",
  tenantId: "t1",
  name: "Training",
  slug: "training",
  color: "#7c3aed",
  isSystem: false,
  isActive: true,
  parentId: null
};

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.mocked(api).mockImplementation(async (path: string) => {
    if (path === ROUTES.TENANTS.HOLIDAYS) return { items: [] };
    if (path === ROUTES.TENANTS.ACTIVITY_TYPES) return { items: [training] };
    return { ok: true };
  });
});

describe("AccountOrganizationCatalogs", () => {
  it("always shows a nested sub-activity row under each main activity", async () => {
    render(<AccountOrganizationCatalogs canManage />);

    await waitFor(() => {
      expect(screen.getByTestId("org-activity-type-training")).toBeTruthy();
    });
    expect(screen.getByTestId("org-activity-children-training")).toBeTruthy();
    expect(screen.getByText("No sub-activities yet.")).toBeTruthy();
  });

  it("nests a sub-activity under a catalog type the admin created", async () => {
    render(<AccountOrganizationCatalogs canManage />);

    await waitFor(() => {
      expect(screen.getByTestId("org-activity-type-training")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Sub-activity of Training"), {
      target: { value: "Workshop" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add sub" }));

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        ROUTES.TENANTS.ACTIVITY_TYPES,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            name: "Workshop",
            color: "#7c3aed",
            parentId: "training-1"
          })
        })
      );
    });
  });

  it("renders saved sub-activities under their main activity", async () => {
    vi.mocked(api).mockImplementation(async (path: string) => {
      if (path === ROUTES.TENANTS.HOLIDAYS) return { items: [] };
      if (path === ROUTES.TENANTS.ACTIVITY_TYPES) {
        return {
          items: [
            training,
            {
              ...training,
              id: "workshop-1",
              name: "Workshop",
              slug: "workshop",
              parentId: "training-1"
            }
          ]
        };
      }
      return { ok: true };
    });

    render(<AccountOrganizationCatalogs canManage />);

    await waitFor(() => {
      expect(screen.getByTestId("org-activity-type-workshop")).toBeTruthy();
    });
    expect(screen.getByTestId("org-activity-children-training").textContent).toContain("Workshop");
  });

  it("patches an existing activity type from the edit dialog", async () => {
    render(<AccountOrganizationCatalogs canManage />);

    await waitFor(() => {
      expect(screen.getByTestId("org-activity-type-training")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("org-activity-edit-training"));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Enablement" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        ROUTES.TENANTS.ACTIVITY_TYPE("training-1"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            color: "#7c3aed",
            isActive: true,
            name: "Enablement",
            parentId: null
          })
        })
      );
    });
  });
});
