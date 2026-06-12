import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePaginatedList } from "./use-paginated-list";

const fetchPaginatedList = vi.fn();

vi.mock("../api/fetch-list-items", () => ({
  fetchPaginatedList: (...args: unknown[]) => fetchPaginatedList(...args)
}));

describe("usePaginatedList", () => {
  beforeEach(() => {
    fetchPaginatedList.mockReset();
    fetchPaginatedList.mockResolvedValue({
      items: [{ id: "1" }],
      total: 1,
      totalPages: 1
    });
  });

  it("does not refetch on every render when filters is a new object with the same values", async () => {
    const { rerender } = renderHook(
      ({ filters }) =>
        usePaginatedList<{ id: string }>({
          workspaceId: "ws-1",
          basePath: "/tasks",
          filters
        }),
      { initialProps: { filters: { projectId: "p-1" } } }
    );

    await waitFor(() => expect(fetchPaginatedList).toHaveBeenCalledTimes(1));

    rerender({ filters: { projectId: "p-1" } });
    rerender({ filters: { projectId: "p-1" } });

    await waitFor(() => expect(fetchPaginatedList).toHaveBeenCalledTimes(1));
  });

  it("refetches when serialized filters change", async () => {
    const { rerender } = renderHook(
      ({ filters }) =>
        usePaginatedList<{ id: string }>({
          workspaceId: "ws-1",
          basePath: "/tasks",
          filters
        }),
      { initialProps: { filters: { projectId: "p-1" } } }
    );

    await waitFor(() => expect(fetchPaginatedList).toHaveBeenCalledTimes(1));

    rerender({ filters: { projectId: "p-2" } });

    await waitFor(() => expect(fetchPaginatedList).toHaveBeenCalledTimes(2));
  });
});
