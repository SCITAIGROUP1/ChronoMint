import { create } from "zustand";
import type { WorkspaceWithRoleDto } from "@chronomint/contracts";

interface WorkspacesState {
  workspaces: WorkspaceWithRoleDto[];
  setWorkspaces: (workspaces: WorkspaceWithRoleDto[]) => void;
}

export const useWorkspacesStore = create<WorkspacesState>((set) => ({
  workspaces: [],
  setWorkspaces: (workspaces) => set({ workspaces })
}));
