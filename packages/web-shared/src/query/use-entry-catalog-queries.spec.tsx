/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { useEntryCatalogQueries } from "./use-entry-catalog-queries";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useEntryCatalogQueries", () => {
  it("reuses the same empty lists while catalog data has not loaded", () => {
    const { result, rerender } = renderHook(
      () => useEntryCatalogQueries("ws-1", { enabled: false }),
      { wrapper }
    );

    const { projects, categories, tasks } = result.current;
    rerender();

    expect(result.current.projects).toBe(projects);
    expect(result.current.categories).toBe(categories);
    expect(result.current.tasks).toBe(tasks);
    expect(projects).toEqual([]);
  });
});
