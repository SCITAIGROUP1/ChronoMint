"use client";

import { ROUTES } from "@kloqra/contracts";
import type { ActiveTimerDto, AutoStoppedTimerDto } from "@kloqra/contracts";
import { invalidateTimelogData } from "@kloqra/web-shared";
import { create } from "zustand";
import { memberStoreKey, memberStoreKeysForWorkspace } from "./member-store-cache-key";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";
import { normalizeActiveTimer, useTimerStore } from "@/stores/timer.store";

function resolveMemberUserId(): string | null {
  return useSessionStore.getState().session?.user?.id ?? null;
}

type ActiveTimerStoreState = {
  refCounts: Record<string, number>;
  initialized: Record<string, boolean>;
  refreshActive: (workspaceId: string) => Promise<void>;
  subscribeActive: (workspaceId: string) => () => void;
  invalidateActive: (workspaceId: string) => void;
  removeWorkspace: (workspaceId: string) => void;
  clear: () => void;
};

export const useActiveTimerSessionStore = create<ActiveTimerStoreState>((set, get) => ({
  refCounts: {},
  initialized: {},

  refreshActive: async (workspaceId) => {
    const userId = resolveMemberUserId();
    if (!workspaceId || !userId) return;
    const key = memberStoreKey(userId, workspaceId);
    try {
      const res = await api<ActiveTimerDto | AutoStoppedTimerDto | null>(ROUTES.TIMER.ACTIVE, {
        workspaceId
      });
      const activeUserId = resolveMemberUserId();
      if (activeUserId !== userId) return;
      const active =
        res && "autostopped" in res && res.autostopped
          ? null
          : normalizeActiveTimer(res as ActiveTimerDto | null);
      useTimerStore.getState().setActive(active);
      if (res && "autostopped" in res && res.autostopped) {
        void invalidateTimelogData(workspaceId);
      }
    } catch {
      useTimerStore.getState().setActive(null);
    } finally {
      set((state) => ({
        initialized: { ...state.initialized, [key]: true }
      }));
    }
  },

  subscribeActive: (workspaceId) => {
    const userId = resolveMemberUserId();
    if (!userId || !workspaceId) return () => undefined;

    const key = memberStoreKey(userId, workspaceId);
    const nextCount = (get().refCounts[key] ?? 0) + 1;
    set((s) => ({ refCounts: { ...s.refCounts, [key]: nextCount } }));

    if (!get().initialized[key]) {
      void get().refreshActive(workspaceId);
    }

    return () => {
      const remaining = Math.max(0, (get().refCounts[key] ?? 1) - 1);
      const nextRefCounts = { ...get().refCounts };
      if (remaining === 0) {
        delete nextRefCounts[key];
      } else {
        nextRefCounts[key] = remaining;
      }
      set({ refCounts: nextRefCounts });
    };
  },

  invalidateActive: (workspaceId) => {
    const userId = resolveMemberUserId();
    if (!userId) return;
    const key = memberStoreKey(userId, workspaceId);
    set((state) => {
      const initialized = { ...state.initialized };
      delete initialized[key];
      return { initialized };
    });
    if ((get().refCounts[key] ?? 0) > 0) {
      void get().refreshActive(workspaceId);
    }
  },

  removeWorkspace: (workspaceId) => {
    set((state) => {
      const initialized = { ...state.initialized };
      const refCounts = { ...state.refCounts };
      for (const key of memberStoreKeysForWorkspace(initialized, workspaceId)) {
        delete initialized[key];
        delete refCounts[key];
      }
      return { initialized, refCounts };
    });
  },

  clear: () => set({ refCounts: {}, initialized: {} })
}));
