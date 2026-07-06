import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useClientTablePagination } from "./use-client-table-pagination";

describe("useClientTablePagination", () => {
  it("pages through in-memory items", () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1);
    const { result } = renderHook(() => useClientTablePagination(items, 10));

    expect(result.current.pageItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result.current.totalPages).toBe(3);

    act(() => result.current.setPage(2));
    expect(result.current.pageItems[0]).toBe(11);
  });

  it("resets to page 1 when page size changes", () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1);
    const { result } = renderHook(() => useClientTablePagination(items, 10));

    act(() => result.current.setPage(2));
    act(() => result.current.setLimit(25));

    expect(result.current.page).toBe(1);
    expect(result.current.pageItems).toHaveLength(25);
  });
});
