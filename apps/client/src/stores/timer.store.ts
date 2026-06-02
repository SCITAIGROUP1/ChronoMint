import { create } from "zustand";
import type { ActiveTimerDto } from "@chronomint/contracts";

interface TimerState {
  active: ActiveTimerDto | null;
  elapsedSec: number;
  setActive: (t: ActiveTimerDto | null) => void;
  tick: () => void;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  active: null,
  elapsedSec: 0,
  setActive: (active) =>
    set({
      active,
      elapsedSec: active?.elapsedSec ?? 0
    }),
  tick: () => {
    const { active } = get();
    if (!active) return;
    const elapsed = Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000);
    set({ elapsedSec: elapsed });
  }
}));
