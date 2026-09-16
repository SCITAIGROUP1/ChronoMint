import type { Permission, PolicyConfigurationDto } from "@kloqra/contracts";
import { create } from "zustand";

interface DraftHistoryEntry {
  permission: Permission;
  previous: PolicyConfigurationDto | undefined;
}

interface PermissionDraftState {
  targetKey: string | null;
  baseRevision: number | null;
  values: Partial<Record<Permission, PolicyConfigurationDto>>;
  history: DraftHistoryEntry[];
  begin: (targetKey: string, revision: number) => void;
  set: (permission: Permission, value: PolicyConfigurationDto) => void;
  undo: () => void;
  discard: () => void;
}

export const usePermissionDraftStore = create<PermissionDraftState>((set) => ({
  targetKey: null,
  baseRevision: null,
  values: {},
  history: [],
  begin: (targetKey, revision) =>
    set((state) =>
      state.targetKey === targetKey
        ? { baseRevision: revision }
        : { targetKey, baseRevision: revision, values: {}, history: [] }
    ),
  set: (permission, value) =>
    set((state) => ({
      values: { ...state.values, [permission]: value },
      history: [...state.history, { permission, previous: state.values[permission] }]
    })),
  undo: () =>
    set((state) => {
      const entry = state.history.at(-1);
      if (!entry) return state;
      const values = { ...state.values };
      if (entry.previous === undefined) delete values[entry.permission];
      else values[entry.permission] = entry.previous;
      return { values, history: state.history.slice(0, -1) };
    }),
  discard: () => set({ values: {}, history: [] })
}));
