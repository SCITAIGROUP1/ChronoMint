import type { WorkspaceWithRoleDto } from "@kloqra/contracts";
import { create } from "zustand";

interface ProjectsState {
  workspaceNamesById: Record<string, string>;
  setWorkspaces: (workspaces: WorkspaceWithRoleDto[]) => void;
  clear: () => void;
}

export const useProjectsStore = create<ProjectsState>((set) => ({
  workspaceNamesById: {},
  setWorkspaces: (workspaces) =>
    set({
      workspaceNamesById: Object.fromEntries(workspaces.map((w) => [w.id, w.name]))
    }),
  clear: () => set({ workspaceNamesById: {} })
}));
