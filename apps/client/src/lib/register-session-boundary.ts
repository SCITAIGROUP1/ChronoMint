import { registerSessionBoundaryHandler } from "@kloqra/web-shared";
import { clearAssistantStorage } from "@/features/assistant/assistant-storage";
import {
  useMemberReportingStore,
  useMySubmissionsStore,
  useActiveTimerSessionStore
} from "@/stores/member-data.store";
import { useOfflineStore } from "@/stores/offline-store";
import { useProjectsStore } from "@/stores/projects.store";
import { useTimerStore } from "@/stores/timer.store";
import { useTimesheetStore } from "@/stores/timesheet.store";

registerSessionBoundaryHandler(({ level }) => {
  if (level === "full") {
    useOfflineStore.getState().clearQueue();
    useProjectsStore.getState().clear();
    useTimerStore.getState().clear();
    useTimesheetStore.getState().clear();
    useMemberReportingStore.getState().clear();
    useMySubmissionsStore.getState().clear();
    useActiveTimerSessionStore.getState().clear();
    clearAssistantStorage();
    return;
  }

  if (level === "workspace") {
    useProjectsStore.getState().clear();
    useTimerStore.getState().clear();
    useTimesheetStore.getState().clear();
    useOfflineStore.getState().hydrateForSession();
  }
});
