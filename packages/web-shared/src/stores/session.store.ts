import type { AuthSessionDto } from "@chronomint/contracts";
import { create } from "zustand";

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
    if (typeof window !== "undefined") {
      localStorage.setItem("cm-access-token", accessToken);
      localStorage.setItem("cm-workspace-id", session.workspaceId);
    }
    set({ session, accessToken });
  },
  clear: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("cm-access-token");
      localStorage.removeItem("cm-workspace-id");
    }
    set({ session: null, accessToken: null });
  }
}));

export function getWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cm-workspace-id");
}
