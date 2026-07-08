import type { WorkspaceListItemDto } from "@kloqra/contracts";
import { create } from "zustand";

interface WorkspacesState {
  /** Slim list rows from GET /workspaces — id/name/role (no slug required). */
  workspaces: WorkspaceListItemDto[];
  setWorkspaces: (workspaces: WorkspaceListItemDto[]) => void;
  /**
   * Load once when empty, coalescing concurrent callers (shell + switcher).
   * Returns the current list when already seeded.
   */
  ensureLoaded: (fetcher: () => Promise<WorkspaceListItemDto[]>) => Promise<WorkspaceListItemDto[]>;
  clear: () => void;
}

let ensureInflight: Promise<WorkspaceListItemDto[]> | null = null;

export const useWorkspacesStore = create<WorkspacesState>((set, get) => ({
  workspaces: [],
  setWorkspaces: (workspaces) => {
    ensureInflight = null;
    set({ workspaces });
  },
  ensureLoaded: (fetcher) => {
    const seeded = get().workspaces;
    if (seeded.length > 0) return Promise.resolve(seeded);
    if (ensureInflight) return ensureInflight;

    ensureInflight = fetcher()
      .then((list) => {
        if (list.length > 0) {
          set({ workspaces: list });
        }
        return get().workspaces.length > 0 ? get().workspaces : list;
      })
      .finally(() => {
        ensureInflight = null;
      });

    return ensureInflight;
  },
  clear: () => {
    ensureInflight = null;
    set({ workspaces: [] });
  }
}));
