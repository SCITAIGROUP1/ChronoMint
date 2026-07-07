import { registerSessionBoundaryHandler } from "@kloqra/web-shared";
import { useAccountWidgetLayout } from "@/features/account/use-account-widget-layout";
import { useWidgetLayout } from "@/features/dashboard/use-widget-layout";
import { usePendingTimesheetsStore } from "@/stores/pending-timesheets.store";
import { usePresenceStore } from "@/stores/presence.store";

registerSessionBoundaryHandler(({ level, prev }) => {
  if (level === "full") {
    usePresenceStore.getState().clear();
    usePendingTimesheetsStore.getState().clear();
    useWidgetLayout.getState().clear();
    useAccountWidgetLayout.getState().clear();
    return;
  }

  if (level === "workspace" && prev?.workspaceId) {
    usePresenceStore.getState().clear();
    usePendingTimesheetsStore.getState().clear();
    useWidgetLayout.getState().removeWorkspace(prev.workspaceId);
  }
});
