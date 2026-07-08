"use client";

import { ROUTES, type TenantDto } from "@kloqra/contracts";
import { useCallback, useEffect } from "react";
import { api } from "../../api/client";
import { tenantCurrentCacheKey, useTenantCurrentStore } from "../../stores/tenant-current.store";
import { tenantApiOptions, useTenantApiWorkspaceId } from "./tenant-api-workspace";

export function useTenantCurrent() {
  const workspaceId = useTenantApiWorkspaceId();
  const cacheKey = tenantCurrentCacheKey(workspaceId);
  const entry = useTenantCurrentStore((s) => s.byKey[cacheKey]);
  const load = useTenantCurrentStore((s) => s.load);

  const reload = useCallback(async () => {
    useTenantCurrentStore.setState((state) => {
      const byKey = { ...state.byKey };
      delete byKey[cacheKey];
      const inflight = { ...state.inflight };
      delete inflight[cacheKey];
      return { byKey, inflight };
    });
    await load(cacheKey, () =>
      api<TenantDto>(ROUTES.TENANTS.CURRENT, tenantApiOptions(workspaceId))
    );
  }, [cacheKey, load, workspaceId]);

  useEffect(() => {
    void load(cacheKey, () =>
      api<TenantDto>(ROUTES.TENANTS.CURRENT, tenantApiOptions(workspaceId))
    );
  }, [cacheKey, load, workspaceId]);

  return {
    tenant: entry?.tenant ?? null,
    loading: entry?.loading ?? true,
    error: entry?.error ?? null,
    reload
  };
}
