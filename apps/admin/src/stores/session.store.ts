import { create } from "zustand";
import type { AuthSessionDto } from "@chronomint/contracts";

interface SessionState {
  session: AuthSessionDto | null;
  accessToken: string | null;
  setSession: (session: AuthSessionDto, accessToken: string) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  accessToken: null,
  setSession: (session, accessToken) => {
    localStorage.setItem("cm-access-token", accessToken);
    localStorage.setItem("cm-workspace-id", session.workspaceId);
    set({ session, accessToken });
  },
  clear: () => {
    localStorage.removeItem("cm-access-token");
    localStorage.removeItem("cm-workspace-id");
    set({ session: null, accessToken: null });
  }
}));

export function getWorkspaceId() {
  return localStorage.getItem("cm-workspace-id");
}
