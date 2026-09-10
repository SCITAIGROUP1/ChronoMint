/** @vitest-environment jsdom */
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectsNavBadgeCount } from "./use-projects-nav-badge-count";

const mocks = vi.hoisted(() => ({
  fetchPaginatedList: vi.fn()
}));

vi.mock("@kloqra/web-shared", () => ({
  fetchPaginatedList: mocks.fetchPaginatedList
}));

describe("useProjectsNavBadgeCount", () => {
  beforeEach(() => {
    mocks.fetchPaginatedList.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the paginated total so admins see workspace project count", async () => {
    mocks.fetchPaginatedList.mockResolvedValue({
      items: [{ id: "p1" }],
      page: 1,
      limit: 1,
      total: 6,
      totalPages: 6
    });

    const { result } = renderHook(() => useProjectsNavBadgeCount("ws-1", true));

    await waitFor(() => expect(result.current).toBe(6));
    expect(mocks.fetchPaginatedList).toHaveBeenCalledWith(
      "/projects",
      expect.objectContaining({ workspaceId: "ws-1", page: 1, limit: 1 })
    );
  });

  it("returns 0 when disabled", async () => {
    const { result } = renderHook(() => useProjectsNavBadgeCount("ws-1", false));
    expect(result.current).toBe(0);
    expect(mocks.fetchPaginatedList).not.toHaveBeenCalled();
  });

  it("returns 0 when the request fails", async () => {
    mocks.fetchPaginatedList.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useProjectsNavBadgeCount("ws-1", true));
    await waitFor(() => expect(result.current).toBe(0));
  });
});
