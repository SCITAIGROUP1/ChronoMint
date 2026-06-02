import { create } from "zustand";
import type { TimeLogDto } from "@chronomint/contracts";

interface TimesheetState {
  logs: TimeLogDto[];
  setLogs: (logs: TimeLogDto[]) => void;
}

export const useTimesheetStore = create<TimesheetState>((set) => ({
  logs: [],
  setLogs: (logs) => set({ logs })
}));
