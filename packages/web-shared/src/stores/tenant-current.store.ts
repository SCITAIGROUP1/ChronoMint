"use client";

import type { TenantDto } from "@kloqra/contracts";
import { create } from "zustand";

type TenantCurrentEntry = {
  tenant: TenantDto | null;
  loading: boolean;
  error: string | null;
};

type TenantCurrentStoreState = {
  byKey: Record<string, TenantCurrentEntry>;
  inflight: Record<string, Promise<TenantDto | null>>;
  load: (key: string, fetcher: () => Promise<TenantDto>) => Promise<TenantDto | null>;
  setTenant: (key: string, tenant: TenantDto) => void;
  clear: () => void;
  removeKey: (key: string) => void;
};

const EMPTY: TenantCurrentEntry = { tenant: null, loading: false, error: null };

export function tenantCurrentCacheKey(workspaceId: string | null | undefined): string {
  return workspaceId?.trim() ? `ws:${workspaceId}` : "tenant-only";
}

export const useTenantCurrentStore = create<TenantCurrentStoreState>((set, get) => ({
  byKey: {},
  inflight: {},

  clear: () => set({ byKey: {}, inflight: {} }),

  removeKey: (key) => {
    set((state) => {
      const byKey = { ...state.byKey };
      const inflight = { ...state.inflight };
      delete byKey[key];
      delete inflight[key];
      return { byKey, inflight };
    });
  },

  setTenant: (key, tenant) => {
    set((state) => ({
      byKey: {
        ...state.byKey,
        [key]: { tenant, loading: false, error: null }
      }
    }));
  },

  load: async (key, fetcher) => {
    const existing = get().inflight[key];
    if (existing) return existing;

    const cached = get().byKey[key];
    if (cached?.tenant && !cached.loading) {
      return cached.tenant;
    }

    set((state) => ({
      byKey: {
        ...state.byKey,
        [key]: {
          tenant: state.byKey[key]?.tenant ?? null,
          loading: true,
          error: null
        }
      }
    }));

    const promise = fetcher()
      .then((tenant) => {
        set((state) => {
          const inflight = { ...state.inflight };
          delete inflight[key];
          return {
            inflight,
            byKey: {
              ...state.byKey,
              [key]: { tenant, loading: false, error: null }
            }
          };
        });
        return tenant;
      })
      .catch((e) => {
        const message =
          e instanceof Error
            ? e.message
            : "We couldn't load your organization profile. Please try again.";
        set((state) => {
          const inflight = { ...state.inflight };
          delete inflight[key];
          return {
            inflight,
            byKey: {
              ...state.byKey,
              [key]: { tenant: null, loading: false, error: message }
            }
          };
        });
        return null;
      });

    set((state) => ({ inflight: { ...state.inflight, [key]: promise } }));
    return promise;
  }
}));

export function getTenantCurrentEntry(key: string): TenantCurrentEntry {
  return useTenantCurrentStore.getState().byKey[key] ?? EMPTY;
}

/** Seed tenant current from an onboarding/auth prefetch so account chrome avoids a duplicate fetch. */
export function seedTenantCurrentCache(tenant: TenantDto, workspaceId?: string | null): void {
  useTenantCurrentStore.getState().setTenant(tenantCurrentCacheKey(workspaceId ?? null), tenant);
}
