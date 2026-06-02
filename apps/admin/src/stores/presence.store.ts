import { create } from "zustand";
import type { PresenceSnapshotDto } from "@chronomint/contracts";

interface PresenceState {
  snapshot: PresenceSnapshotDto | null;
  setSnapshot: (s: PresenceSnapshotDto) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  snapshot: null,
  setSnapshot: (snapshot) => set({ snapshot })
}));
