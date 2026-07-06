/** @vitest-environment jsdom */
import { ROUTES } from "@kloqra/contracts";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useTenantDataExport,
  isExportInProgress,
  isStaleExportJob
} from "./use-tenant-data-export";

const api = vi.fn();

vi.mock("../../api/client", () => ({
  api: (...args: unknown[]) => api(...args),
  ApiRequestError: class ApiRequestError extends Error {
    readonly status: number;
    readonly code?: string;
    constructor(message: string, status: number, code?: string) {
      super(message);
      this.name = "ApiRequestError";
      this.status = status;
      this.code = code;
    }
  }
}));

vi.mock("../../stores/session.store", () => ({
  getWorkspaceId: () => "ws-1",
  useSessionStore: (selector: (s: { session: { workspaceId: string } }) => unknown) =>
    selector({ session: { workspaceId: "ws-1" } })
}));

describe("useTenantDataExport", () => {
  beforeEach(() => {
    api.mockReset();
  });

  it("loads the latest export job on mount", async () => {
    api.mockResolvedValue({
      id: "job-1",
      status: "ready",
      tenantId: "tenant-1"
    });

    const { result } = renderHook(() => useTenantDataExport());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api).toHaveBeenCalledWith(ROUTES.TENANTS.DATA_EXPORT, { workspaceId: "ws-1" });
    expect(result.current.job?.id).toBe("job-1");
    expect(result.current.error).toBeNull();
  });

  it("clears stale jobs when the latest export is missing", async () => {
    api.mockRejectedValue(new Error("Export job not found"));

    const { result } = renderHook(() => useTenantDataExport());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.job).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("clears stale jobs when polling returns not found", async () => {
    api.mockResolvedValueOnce({
      id: "job-1",
      status: "queued",
      tenantId: "tenant-1"
    });
    api.mockRejectedValue(new Error("Export job not found"));

    const { result } = renderHook(() => useTenantDataExport());

    await waitFor(() => expect(result.current.job?.status).toBe("queued"));

    await act(async () => {
      await result.current.refreshJob("job-1");
    });

    expect(result.current.job).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

describe("isExportInProgress", () => {
  const baseJob = {
    id: "job-1",
    tenantId: "tenant-1",
    requestedByUserId: "user-1",
    filename: null,
    contentType: null,
    byteSize: null,
    errorMessage: null,
    completedAt: null,
    expiresAt: null
  };

  it("returns false for failed or ready jobs", () => {
    expect(
      isExportInProgress({ ...baseJob, status: "failed", createdAt: new Date().toISOString() })
    ).toBe(false);
    expect(
      isExportInProgress({ ...baseJob, status: "ready", createdAt: new Date().toISOString() })
    ).toBe(false);
  });

  it("returns true for recent queued jobs", () => {
    expect(
      isExportInProgress({ ...baseJob, status: "queued", createdAt: new Date().toISOString() })
    ).toBe(true);
  });

  it("returns false for stale queued jobs", () => {
    const staleCreatedAt = new Date(Date.now() - 31 * 60 * 1000).toISOString();
    const job = { ...baseJob, status: "queued" as const, createdAt: staleCreatedAt };
    expect(isStaleExportJob(job)).toBe(true);
    expect(isExportInProgress(job)).toBe(false);
  });
});
