import type { TimeLogDto } from "@kloqra/contracts";
import { create } from "zustand";

interface TimesheetState {
  logs: TimeLogDto[];
  setLogs: (logs: TimeLogDto[]) => void;
  clear: () => void;
}

export const useTimesheetStore = create<TimesheetState>((set) => ({
  logs: [],
  setLogs: (logs) => set({ logs }),
  clear: () => set({ logs: [] })
}));
