"use client";

import { ErrorCodes, ROUTES, type TenantDataExportJobDto } from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api, ApiRequestError } from "../../api/client";
import { getWorkspaceId, useSessionStore } from "../../stores/session.store";

const STALE_EXPORT_MS = 30 * 60 * 1000;

export function isStaleExportJob(job: TenantDataExportJobDto): boolean {
  if (job.status !== "queued" && job.status !== "running") {
    return false;
  }
  return Date.now() - new Date(job.createdAt).getTime() > STALE_EXPORT_MS;
}

export function isExportInProgress(job: TenantDataExportJobDto | null): boolean {
  if (!job) {
    return false;
  }
  if (job.status !== "queued" && job.status !== "running") {
    return false;
  }
  return !isStaleExportJob(job);
}

function isMissingExportJobError(error: unknown): boolean {
  if (error instanceof ApiRequestError) {
    return error.status === 404 || error.code === ErrorCodes.NOT_FOUND;
  }
  if (error instanceof Error) {
    return error.message.toLowerCase().includes("export job not found");
  }
  return false;
}

export function useTenantDataExport() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [job, setJob] = useState<TenantDataExportJobDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ws) return;
    let active = true;
    setLoading(true);
    setError(null);
    api<TenantDataExportJobDto | null>(ROUTES.TENANTS.DATA_EXPORT, {
      workspaceId: ws
    })
      .then((data) => {
        if (active) {
          setJob(data);
        }
      })
      .catch((e) => {
        if (!active) return;
        if (isMissingExportJobError(e)) {
          setJob(null);
          setError(null);
          return;
        }
        setError(e instanceof Error ? e.message : "Could not load latest export job");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [ws]);

  const startExport = useCallback(async () => {
    if (!ws) return null;
    setLoading(true);
    setError(null);
    try {
      const created = await api<TenantDataExportJobDto>(ROUTES.TENANTS.DATA_EXPORT, {
        method: "POST",
        body: JSON.stringify({}),
        workspaceId: ws
      });
      setJob(created);
      return created;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start export");
      return null;
    } finally {
      setLoading(false);
    }
  }, [ws]);

  const refreshJob = useCallback(
    async (jobId: string) => {
      if (!ws) return null;
      try {
        const current = await api<TenantDataExportJobDto>(ROUTES.TENANTS.DATA_EXPORT_JOB(jobId), {
          workspaceId: ws
        });
        setJob(current);
        return current;
      } catch (e) {
        if (isMissingExportJobError(e)) {
          setJob(null);
          setError(null);
          return null;
        }
        setError(e instanceof Error ? e.message : "Could not refresh export status");
        return null;
      }
    },
    [ws]
  );

  const cancelExport = useCallback(
    async (jobId: string) => {
      if (!ws) return null;
      setLoading(true);
      setError(null);
      try {
        const result = await api<TenantDataExportJobDto>(ROUTES.TENANTS.DATA_EXPORT_JOB(jobId), {
          method: "DELETE",
          workspaceId: ws
        });
        setJob(result);
        return result;
      } catch (e) {
        if (isMissingExportJobError(e)) {
          setJob(null);
          setError(null);
          return null;
        }
        setError(e instanceof Error ? e.message : "Could not cancel export");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [ws]
  );

  return {
    job,
    loading,
    error,
    startExport,
    refreshJob,
    cancelExport,
    setJob,
    isExportInProgress: isExportInProgress(job)
  };
}
