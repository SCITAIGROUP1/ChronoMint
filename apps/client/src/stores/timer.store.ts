import type { ActiveTimerDto } from "@chronomint/contracts";
import { create } from "zustand";

interface TimerState {
  active: ActiveTimerDto | null;
  elapsedSec: number;
  setActive: (t: ActiveTimerDto | null) => void;
  tick: () => void;
}

export function normalizeActiveTimer(t: ActiveTimerDto | null | undefined): ActiveTimerDto | null {
  if (!t || typeof t !== "object") return null;
  if (!t.taskId || !t.startedAt || !t.userId || !t.workspaceId) return null;
  if (!Number.isFinite(new Date(t.startedAt).getTime())) return null;
  return t;
}

export function isActiveTimer(t: ActiveTimerDto | null | undefined): t is ActiveTimerDto {
  return normalizeActiveTimer(t) !== null;
}

function elapsedFromActive(active: ActiveTimerDto | null): number {
  if (!active) return 0;
  const startedMs = new Date(active.startedAt).getTime();
  if (Number.isFinite(startedMs)) {
    return Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
  }
  const fromApi = active.elapsedSec;
  return Number.isFinite(fromApi) && fromApi >= 0 ? fromApi : 0;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  active: null,
  elapsedSec: 0,
  setActive: (active) => {
    const normalized = normalizeActiveTimer(active);
    set({
      active: normalized,
      elapsedSec: elapsedFromActive(normalized)
    });
  },
  tick: () => {
    const { active } = get();
    if (!isActiveTimer(active)) return;
    set({ elapsedSec: elapsedFromActive(active) });
  }
}));
