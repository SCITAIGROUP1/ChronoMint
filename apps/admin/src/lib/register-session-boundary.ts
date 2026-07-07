import { registerSessionBoundaryHandler } from "@kloqra/web-shared";
import { usePendingTimesheetsStore } from "@/stores/pending-timesheets.store";
import { usePresenceStore } from "@/stores/presence.store";

registerSessionBoundaryHandler(({ level }) => {
  if (level === "full" || level === "workspace") {
    usePresenceStore.getState().clear();
    usePendingTimesheetsStore.getState().clear();
  }
});
