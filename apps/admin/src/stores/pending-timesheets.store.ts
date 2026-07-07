"use client";

import {
  ROUTES,
  type ListPendingTimesheetsResponseDto,
  type PendingTimesheetDto,
  type TimesheetApprovalsFilterQuery
} from "@kloqra/contracts";
import { buildApprovalsCountQueryString, buildApprovalsListQueryString } from "@kloqra/web-shared";
import { create } from "zustand";
import { api } from "@/lib/api";

const POLL_MS = 60_000;
export const EMPTY_PENDING_TIMESHEETS: PendingTimesheetDto[] = [];

type PendingEntry = {
  items: PendingTimesheetDto[];
  loading: boolean;
  error: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type PendingTimesheetsStoreState = {
  byKey: Record<string, PendingEntry>;
  refCounts: Record<string, number>;
  pollTimer: ReturnType<typeof setInterval> | null;
  pollKey: string | null;

  fetchPending: (workspaceId: string, filterKey: string) => Promise<void>;
  subscribe: (workspaceId: string, filterKey: string) => () => void;
  removeItem: (workspaceId: string, filterKey: string, id: string) => void;
  refreshWorkspace: (workspaceId: string) => void;
  clear: () => void;
};

function cacheKey(workspaceId: string, filterKey: string) {
  return `${workspaceId}:${filterKey}`;
}

function buildPendingPath(filterKey: string) {
  return filterKey
    ? `${ROUTES.TIMESHEETS.LIST_PENDING}?${filterKey}`
    : ROUTES.TIMESHEETS.LIST_PENDING;
}

function shouldPollPendingApprovals(filterKey: string): boolean {
  if (!filterKey) return true;
  if (filterKey === buildApprovalsCountQueryString({})) return true;
  const params = new URLSearchParams(filterKey);
  return [...params.keys()].every((key) => key === "page" || key === "limit");
}

export const usePendingTimesheetsStore = create<PendingTimesheetsStoreState>((set, get) => ({
  byKey: {},
  refCounts: {},
  pollTimer: null,
  pollKey: null,

  fetchPending: async (workspaceId, filterKey) => {
    if (!workspaceId) return;
    const key = cacheKey(workspaceId, filterKey);
    set((state) => ({
      byKey: {
        ...state.byKey,
        [key]: {
          items: state.byKey[key]?.items ?? [],
          loading: true,
          error: false,
          page: state.byKey[key]?.page ?? 1,
          limit: state.byKey[key]?.limit ?? 25,
          total: state.byKey[key]?.total ?? 0,
          totalPages: state.byKey[key]?.totalPages ?? 0
        }
      }
    }));
    try {
      const data = await api<ListPendingTimesheetsResponseDto>(buildPendingPath(filterKey), {
        workspaceId
      });
      set((state) => ({
        byKey: {
          ...state.byKey,
          [key]: {
            items: data.items ?? [],
            loading: false,
            error: false,
            page: data.page ?? 1,
            limit: data.limit ?? 25,
            total: data.total ?? 0,
            totalPages: data.totalPages ?? 0
          }
        }
      }));
    } catch {
      set((state) => ({
        byKey: {
          ...state.byKey,
          [key]: {
            items: [],
            loading: false,
            error: true,
            page: 1,
            limit: 25,
            total: 0,
            totalPages: 0
          }
        }
      }));
    }
  },

  subscribe: (workspaceId, filterKey) => {
    const key = cacheKey(workspaceId, filterKey);
    const nextCount = (get().refCounts[key] ?? 0) + 1;
    set((s) => ({ refCounts: { ...s.refCounts, [key]: nextCount } }));

    void get().fetchPending(workspaceId, filterKey);

    const shouldPoll = shouldPollPendingApprovals(filterKey);
    if (shouldPoll && !get().pollTimer) {
      const timer = setInterval(() => void get().fetchPending(workspaceId, filterKey), POLL_MS);
      set({ pollTimer: timer, pollKey: key });
    }

    return () => {
      const current = get();
      const remaining = Math.max(0, (current.refCounts[key] ?? 1) - 1);
      const nextRefCounts = { ...current.refCounts };
      if (remaining === 0) {
        delete nextRefCounts[key];
      } else {
        nextRefCounts[key] = remaining;
      }
      set({ refCounts: nextRefCounts });

      if (remaining === 0 && current.pollKey === key && current.pollTimer) {
        clearInterval(current.pollTimer);
        set({ pollTimer: null, pollKey: null });
      }
    };
  },

  removeItem: (workspaceId, filterKey, id) => {
    const key = cacheKey(workspaceId, filterKey);
    set((state) => {
      const entry = state.byKey[key];
      if (!entry) return state;
      const nextItems = entry.items.filter((item) => item.id !== id);
      const diff = entry.items.length - nextItems.length;
      const nextTotal = Math.max(0, entry.total - diff);
      const nextTotalPages = Math.ceil(nextTotal / entry.limit);
      return {
        byKey: {
          ...state.byKey,
          [key]: {
            ...entry,
            items: nextItems,
            total: nextTotal,
            totalPages: nextTotalPages
          }
        }
      };
    });
  },

  refreshWorkspace: (workspaceId) => {
    const state = get();
    for (const key of Object.keys(state.refCounts)) {
      if (!key.startsWith(`${workspaceId}:`)) continue;
      if ((state.refCounts[key] ?? 0) <= 0) continue;
      const filterKey = key.slice(workspaceId.length + 1);
      void get().fetchPending(workspaceId, filterKey);
    }
  },

  clear: () => {
    const timer = get().pollTimer;
    if (timer) clearInterval(timer);
    set({ byKey: {}, refCounts: {}, pollTimer: null, pollKey: null });
  }
}));

export function usePendingTimesheetsListKey(
  workspaceId: string,
  filters: TimesheetApprovalsFilterQuery
) {
  return cacheKey(workspaceId, buildApprovalsListQueryString(filters));
}
