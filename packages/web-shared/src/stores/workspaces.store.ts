import type { WorkspaceListItemDto } from "@kloqra/contracts";
import { create } from "zustand";

interface WorkspacesState {
  /** Slim list rows from GET /workspaces — id/name/role (no slug required). */
  workspaces: WorkspaceListItemDto[];
  setWorkspaces: (workspaces: WorkspaceListItemDto[]) => void;
  clear: () => void;
}

export const useWorkspacesStore = create<WorkspacesState>((set) => ({
  workspaces: [],
  setWorkspaces: (workspaces) => set({ workspaces }),
  clear: () => set({ workspaces: [] })
}));
