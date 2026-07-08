/** @vitest-environment jsdom */
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { invalidateTimelogQueries } from "./invalidate-timelog-queries";
import { getQueryClient, resetQueryClient } from "./query-client";
import { timelogQueryKeys } from "./timelog-query-keys";

describe("invalidateTimelogQueries", () => {
  const workspaceId = "00000000-0000-4000-8000-000000000099";
  const path = "/timelogs?from=2026-07-01&to=2026-07-08";

  beforeEach(() => {
    resetQueryClient();
  });

  it("refetches active timelog queries on the shared provider client", async () => {
    const client = getQueryClient();
    const cancelSpy = vi.spyOn(client, "cancelQueries");
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    const refetchSpy = vi.spyOn(client, "refetchQueries");
    const queryFn = vi
      .fn()
      .mockResolvedValueOnce({ items: [{ id: "log-1" }] })
      .mockResolvedValueOnce({ items: [{ id: "log-1" }, { id: "log-2" }] });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: timelogQueryKeys.list(workspaceId, path),
          queryFn
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryFn).toHaveBeenCalledTimes(1);

    await invalidateTimelogQueries(workspaceId);

    expect(cancelSpy).toHaveBeenCalledWith(
      expect.objectContaining({ predicate: expect.any(Function) })
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ predicate: expect.any(Function) })
    );
    expect(refetchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ predicate: expect.any(Function), type: "active" })
    );
    await waitFor(() => expect(queryFn.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it("marks inactive cached timelog queries stale without refetching them", async () => {
    const client = getQueryClient();
    const queryFn = vi.fn().mockResolvedValue({ items: [{ id: "log-1" }] });
    const listKey = timelogQueryKeys.list(workspaceId, path);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { unmount } = renderHook(
      () =>
        useQuery({
          queryKey: listKey,
          queryFn
        }),
      { wrapper }
    );

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));
    unmount();

    await invalidateTimelogQueries(workspaceId);

    expect(client.getQueryState(listKey)?.isInvalidated).toBe(true);
    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});
